import type { z } from '@kbn/zod/v4';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { MemoryToolsOptions } from './types';
declare const memoryReadSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    id: z.ZodOptional<z.ZodString>;
    heading: z.ZodOptional<z.ZodString>;
    offset: z.ZodOptional<z.ZodNumber>;
    limit: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const createMemoryReadTool: ({ getMemoryService, }: MemoryToolsOptions) => BuiltinToolDefinition<typeof memoryReadSchema>;
export {};
