import type { z } from '@kbn/zod/v4';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { MemoryToolsOptions } from './types';
declare const memoryPatchSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    operations: z.ZodArray<z.ZodObject<{
        old_text: z.ZodOptional<z.ZodString>;
        new_text: z.ZodOptional<z.ZodString>;
        heading: z.ZodOptional<z.ZodString>;
        content: z.ZodOptional<z.ZodString>;
        append: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    change_summary: z.ZodString;
}, z.core.$strip>;
export declare const createMemoryPatchTool: ({ getMemoryService, getSecurity, }: MemoryToolsOptions) => BuiltinToolDefinition<typeof memoryPatchSchema>;
export {};
