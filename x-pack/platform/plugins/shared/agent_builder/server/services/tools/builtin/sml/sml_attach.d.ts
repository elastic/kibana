import { z } from '@kbn/zod/v4';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { SmlToolsOptions } from './types';
declare const smlAttachSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        chunk_id: z.ZodString;
        attachment_id: z.ZodString;
        attachment_type: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * Creates the sml_attach tool.
 * Converts SML search results into conversation attachments.
 */
export declare const createSmlAttachTool: ({ getSmlService, }: SmlToolsOptions) => BuiltinToolDefinition<typeof smlAttachSchema>;
export {};
