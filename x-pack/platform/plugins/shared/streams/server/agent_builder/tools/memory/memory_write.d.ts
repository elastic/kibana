import type { z } from '@kbn/zod/v4';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { MemoryToolsOptions } from './types';
declare const memoryWriteSchema: z.ZodObject<{
    name: z.ZodString;
    title: z.ZodString;
    content: z.ZodString;
    categories: z.ZodOptional<z.ZodArray<z.ZodString>>;
    references: z.ZodOptional<z.ZodArray<z.ZodString>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    change_summary: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const createMemoryWriteTool: ({ getMemoryService, getSecurity, }: MemoryToolsOptions) => BuiltinToolDefinition<typeof memoryWriteSchema>;
export {};
