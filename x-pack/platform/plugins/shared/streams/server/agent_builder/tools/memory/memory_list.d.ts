import { z } from '@kbn/zod/v4';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { MemoryToolsOptions } from './types';
declare const memoryListSchema: z.ZodObject<{
    category: z.ZodOptional<z.ZodString>;
    show_category_tree: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const createMemoryListTool: ({ getMemoryService, }: MemoryToolsOptions) => BuiltinToolDefinition<typeof memoryListSchema>;
export {};
