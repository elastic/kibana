import { z } from '@kbn/zod/v4';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { AttachmentToolsOptions } from './types';
declare const attachmentListSchema: z.ZodObject<{
    include_deleted: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
/**
 * Creates the attachment_list tool.
 * Lists all attachments with their metadata.
 */
export declare const createAttachmentListTool: ({ attachmentManager, }: AttachmentToolsOptions) => BuiltinToolDefinition<typeof attachmentListSchema>;
export {};
