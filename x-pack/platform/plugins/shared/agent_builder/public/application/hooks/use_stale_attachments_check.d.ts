import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
export interface UseStaleAttachmentsCheckResult {
    staleAttachments: AttachmentInput[];
    scheduleStaleCheck: () => void;
}
/**
 * Fetches attachment staleness for the active conversation.
 * Stale checks are triggered when:
 * - the user visits a conversation (conversationId changes)
 * - the window regains focus
 */
export declare const useStaleAttachments: (conversationId: string | undefined) => UseStaleAttachmentsCheckResult;
