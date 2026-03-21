import { z } from '@kbn/zod/v4';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { SmlToolsOptions } from './types';
declare const smlSearchSchema: z.ZodObject<{
    keywords: z.ZodArray<z.ZodString>;
    size: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
/**
 * Creates the sml_search tool.
 * Searches the Semantic Metadata Layer for items matching a query.
 */
export declare const createSmlSearchTool: ({ getSmlService, }: SmlToolsOptions) => BuiltinToolDefinition<typeof smlSearchSchema>;
export {};
