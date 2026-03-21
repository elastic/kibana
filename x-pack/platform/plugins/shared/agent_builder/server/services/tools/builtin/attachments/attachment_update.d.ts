import { z } from '@kbn/zod/v4';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { AttachmentToolsOptions } from './types';
declare const attachmentUpdateSchema: z.ZodObject<{
    attachment_id: z.ZodString;
    data: z.ZodRecord<z.ZodString, z.ZodAny>;
    description: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * Creates the attachment_update tool.
 * Updates an attachment's content, creating a new version if content changed.
 */
export declare const createAttachmentUpdateTool: ({ attachmentManager, attachmentsService, }: AttachmentToolsOptions) => BuiltinToolDefinition<typeof attachmentUpdateSchema>;
export {};
