import type { Attachment, AttachmentVersionRef } from '@kbn/agent-builder-common/attachments';
import type { AttachmentBoundedTool, AttachmentRepresentation } from './attachments';
/**
 * Server-side processed attachment: attachment plus its representation and tools.
 */
export interface ProcessedAttachment {
    attachment: Attachment;
    representation: AttachmentRepresentation;
    tools: AttachmentBoundedTool[];
}
/**
 * Server-side processed attachment type, it's type and description needed for instructions.
 */
export interface ProcessedAttachmentType {
    type: string;
    description?: string;
}
/**
 * Server-side processed attachment reference
 */
export interface ProcessedAttachmentVersionRef extends AttachmentVersionRef {
    /** Type added to track instructions */
    type?: string;
}
/**
 * Processed input for a single conversation round (message + processed attachments).
 */
export interface ProcessedRoundInput {
    message: string;
    attachments: ProcessedAttachment[];
    /** References to versioned conversation-level attachments touched during this round. */
    attachment_refs?: ProcessedAttachmentVersionRef[];
    /** Pre-rendered, immutable attachment prompt context for this round (see RoundInput). */
    attachment_context?: string;
}
