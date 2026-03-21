import type { AttachmentFormatContext, AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { AttachmentsService } from '@kbn/agent-builder-server/runner';
/**
 * Options for creating attachment tools with a specific state manager.
 */
export interface AttachmentToolsOptions {
    /** The attachment state manager to operate on */
    attachmentManager: AttachmentStateManager;
    /** Attachment type definitions for formatting (optional) */
    attachmentsService?: AttachmentsService;
    /** Context used when formatting attachments */
    formatContext?: AttachmentFormatContext;
}
