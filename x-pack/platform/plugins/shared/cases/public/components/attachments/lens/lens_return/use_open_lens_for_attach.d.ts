import type { FoundSavedObject } from '../../common/saved_object/types';
interface UseOpenLensForAttachArgs {
    caseId: string;
    caseOwner: string;
}
/**
 * Navigates to the Lens editor for an existing saved object id, recording a
 * pending-attach marker so the case view can auto-attach when the user clicks
 * "Save and return".
 */
export declare const useOpenLensForAttach: ({ caseId, caseOwner }: UseOpenLensForAttachArgs) => (savedObject: FoundSavedObject) => Promise<void>;
export {};
