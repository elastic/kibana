import { z } from '@kbn/zod/v4';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { AttachmentToolsOptions } from './types';
declare const attachmentReadSchema: z.ZodObject<{
    attachment_id: z.ZodString;
    version: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
/**
 * Creates the attachment_read tool.
 * Reads the content of an attachment by ID, optionally at a specific version.
 */
export declare const createAttachmentReadTool: ({ attachmentManager, attachmentsService, formatContext, }: AttachmentToolsOptions) => BuiltinToolDefinition<typeof attachmentReadSchema>;
export {};
