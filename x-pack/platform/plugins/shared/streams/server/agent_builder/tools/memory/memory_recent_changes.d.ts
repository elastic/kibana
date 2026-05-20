import type { z } from '@kbn/zod/v4';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { MemoryToolsOptions } from './types';
declare const memoryRecentChangesSchema: z.ZodObject<{
    size: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const createMemoryRecentChangesTool: ({ getMemoryService, }: MemoryToolsOptions) => BuiltinToolDefinition<typeof memoryRecentChangesSchema>;
export {};
