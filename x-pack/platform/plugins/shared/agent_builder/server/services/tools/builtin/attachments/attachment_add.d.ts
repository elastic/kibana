import { z } from '@kbn/zod/v4';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { AttachmentToolsOptions } from './types';
declare const attachmentAddSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    type: z.ZodString;
    data: z.ZodRecord<z.ZodString, z.ZodAny>;
    description: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * Creates the attachment_add tool.
 * Creates a new attachment with the specified type and content.
 */
export declare const createAttachmentAddTool: ({ attachmentManager, attachmentsService, }: AttachmentToolsOptions) => BuiltinToolDefinition<typeof attachmentAddSchema>;
export {};
