import type { Attachment } from './attachments';
export type StaleAttachment = Attachment & {
    is_stale: true;
    origin: string;
};
export interface FreshAttachment {
    id: string;
    is_stale: false;
    /**
     * When present, the staleness check failed for this attachment (e.g. `isStale` or `resolve` threw).
     */
    error?: string;
}
export type AttachmentStaleCheckResult = StaleAttachment | FreshAttachment;
/** Fresh result where the server reported that staleness evaluation failed for this attachment. */
export type FreshAttachmentStalenessCheckError = FreshAttachment & {
    error: string;
};
export declare function isFreshAttachmentStalenessCheckError(result: AttachmentStaleCheckResult): result is FreshAttachmentStalenessCheckError;
