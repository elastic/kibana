/**
 * Shared state schema for Deep Agent
 */
import { z as z3 } from "zod/v3";
export interface FileData {
    content: string[];
    created_at: string;
    modified_at: string;
    description?: string;
}
/**
 * Agent state schema including filesystem state
 */
export declare const AgentStateSchema: z3.ZodObject<{
    files: import("@langchain/langgraph/zod").ReducedZodChannel<z3.ZodRecord<z3.ZodString, z3.ZodObject<{
        content: z3.ZodArray<z3.ZodString, "many">;
        created_at: z3.ZodString;
        modified_at: z3.ZodString;
        description: z3.ZodOptional<z3.ZodString>;
    }, "strip", z3.ZodTypeAny, {
        created_at: string;
        content: string[];
        modified_at: string;
        description?: string | undefined;
    }, {
        created_at: string;
        content: string[];
        modified_at: string;
        description?: string | undefined;
    }>>, import("@langchain/core/utils/types").InteropZodType<Record<string, {
        created_at: string;
        content: string[];
        modified_at: string;
        description?: string | undefined;
    } | null>>>;
}, "strip", z3.ZodTypeAny, {
    files: Record<string, {
        created_at: string;
        content: string[];
        modified_at: string;
        description?: string | undefined;
    }>;
}, {
    files: Record<string, {
        created_at: string;
        content: string[];
        modified_at: string;
        description?: string | undefined;
    }>;
}>;
