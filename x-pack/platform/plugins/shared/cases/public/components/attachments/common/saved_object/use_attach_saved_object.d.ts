import type { FoundSavedObject } from './types';
export interface UseAttachSavedObjectArgs {
    caseId: string;
    caseOwner: string;
    onAttached: () => void;
}
export interface UseAttachSavedObjectResult {
    attach: (object: FoundSavedObject) => Promise<void>;
    attachmentId: string | null;
    /** True while any attach request from this hook (or its dependencies) is in flight. */
    isAttaching: boolean;
}
/**
 * Builds the right attachment payload for the SO type (dashboard/map snapshot
 * the SO content at attach time; reference-typed search just stores the id),
 * creates the attachment, and refreshes the case view.
 */
export declare const useAttachSavedObject: ({ caseId, caseOwner, onAttached, }: UseAttachSavedObjectArgs) => UseAttachSavedObjectResult;
