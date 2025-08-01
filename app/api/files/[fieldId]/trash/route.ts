import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ fieldId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fieldId } = await props.params;
    if (!fieldId) {
      return NextResponse.json(
        { error: "File ID is required" },
        { status: 400 }
      );
    }

    // Get the current file
    const [file] = await db
      .select()
      .from(files)
      .where(and(eq(files.id, fieldId), eq(files.userId, userId)));

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Toggle the isTrash status (move to trash or restore)
    const [updatedFile] = await db
      .update(files)
      .set({ isTrash: !file.isTrash })
      .where(and(eq(files.id, fieldId), eq(files.userId, userId)))
      .returning();

    const action = updatedFile.isTrash ? "moved to trash" : "restored";
    return NextResponse.json({
      ...updatedFile,
      message: `File ${action} successfully`,
    });
  } catch (error) {
    console.error("Error updating trash status:", error);
    return NextResponse.json(
      { error: "Failed to update file trash status" },
      { status: 500 }
    );
  }
}