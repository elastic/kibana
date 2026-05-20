import type { z } from '@kbn/zod/v4';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { MemoryToolsOptions } from './types';
declare const memorySearchSchema: z.ZodObject<{
    query: z.ZodString;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    categories: z.ZodOptional<z.ZodArray<z.ZodString>>;
    references: z.ZodOptional<z.ZodArray<z.ZodString>>;
    size: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const createMemorySearchTool: ({ getMemoryService, }: MemoryToolsOptions) => BuiltinToolDefinition<typeof memorySearchSchema>;
export {};
