import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { BaseMessageLike } from '@langchain/core/messages';
/**
 * Presentation mode for attachments in the LLM context.
 * - 'inline': Full content shown directly (for few attachments)
 * - 'summary': Only metadata shown, LLM must use tools to access content (for many attachments)
 */
export type AttachmentPresentationMode = 'inline' | 'summary';
/**
 * Result of preparing attachment presentation for the LLM.
 */
export interface AttachmentPresentation {
    /** The chosen presentation mode */
    mode: AttachmentPresentationMode;
    /** Formatted content to include in the LLM context */
    content: string;
    /** Number of active attachments */
    activeCount: number;
}
/**
 * Configuration for attachment presentation.
 */
export interface AttachmentPresentationConfig {
    /** Number of attachments at which to switch from inline to summary mode (default: 5) */
    threshold?: number;
    /** Maximum content length per attachment in inline mode before truncation (default: 10000) */
    maxContentLength?: number;
}
export type AttachmentContentFormatter = (attachment: VersionedAttachment, data: unknown) => Promise<string | undefined>;
/**
 * Prepares the attachment presentation for the LLM context.
 * Chooses between inline (full content) and summary (metadata only) modes
 * based on the number of active attachments.
 */
export declare const prepareAttachmentPresentation: (attachments: VersionedAttachment[], config?: AttachmentPresentationConfig, formatContent?: AttachmentContentFormatter) => Promise<AttachmentPresentation>;
/**
 * Returns the conversation attachments prompt section (title, XML content, and handling instructions).
 * Returns an empty string when there are no active attachments.
 */
export declare const getConversationAttachmentsSection: (presentation?: AttachmentPresentation) => string;
/**
 * Builds the system message(s) used to expose conversation-level attachments to the LLM
 * (attachment XML + handling instructions).
 */
export declare const getConversationAttachmentsSystemMessages: (presentation?: AttachmentPresentation) => BaseMessageLike[];
