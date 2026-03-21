import { z } from '@kbn/zod/v4';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { AttachmentToolsOptions } from './types';
declare const attachmentDiffSchema: z.ZodObject<{
    attachment_id: z.ZodString;
    from_version: z.ZodNumber;
    to_version: z.ZodNumber;
}, z.core.$strip>;
/**
 * Creates the attachment_diff tool.
 * Shows differences between two versions of an attachment.
 */
export declare const createAttachmentDiffTool: ({ attachmentManager, }: AttachmentToolsOptions) => BuiltinToolDefinition<typeof attachmentDiffSchema>;
export {};
