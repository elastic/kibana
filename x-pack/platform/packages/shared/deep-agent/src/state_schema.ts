/**
 * Shared state schema for Deep Agent
 */

import { z as z3 } from "zod/v3";
import { withLangGraph } from "@langchain/langgraph/zod";

/**
 * Zod v3 schema for FileData
 */
const FileDataSchema = z3.object({
  content: z3.array(z3.string()),
  created_at: z3.string(),
  modified_at: z3.string(),
});

export interface FileData {
  content: string[];
  created_at: string;
  modified_at: string;
}

/**
 * Merge file updates with support for deletions.
 */
function fileDataReducer(
  left: Record<string, FileData> | undefined,
  right: Record<string, FileData | null>,
): Record<string, FileData> {
  console.log('fileDataReducer', left, right);
  if (left === undefined) {
    const result: Record<string, FileData> = {};
    for (const [key, value] of Object.entries(right)) {
      if (value !== null) {
        result[key] = value;
      }
    }
    return result;
  }

  const result = { ...left };
  for (const [key, value] of Object.entries(right)) {
    if (value === null) {
      delete result[key];
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Agent state schema including filesystem state
 */
export const AgentStateSchema = z3.object({
  files: withLangGraph(z3.record(z3.string(), FileDataSchema), {
    reducer: {
      fn: fileDataReducer,
      schema: z3.record(z3.string(), FileDataSchema.nullable()),
    },
    default: () => ({}),
  })
});

