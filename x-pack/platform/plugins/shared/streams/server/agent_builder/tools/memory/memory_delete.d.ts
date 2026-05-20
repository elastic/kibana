import type { z } from '@kbn/zod/v4';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { MemoryToolsOptions } from './types';
declare const memoryDeleteSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const createMemoryDeleteTool: ({ getMemoryService, getSecurity, }: MemoryToolsOptions) => BuiltinToolDefinition<typeof memoryDeleteSchema>;
export {};
