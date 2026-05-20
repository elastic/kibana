import type { CaseAttachmentsWithoutOwner, ServerError } from '../types';
export interface PostComment {
    caseId: string;
    caseOwner: string;
    attachments: CaseAttachmentsWithoutOwner;
}
export declare const useCreateAttachments: () => import("@kbn/react-query").UseMutationResult<import("./types").CaseUI, ServerError, PostComment, unknown>;
export type UseCreateAttachments = ReturnType<typeof useCreateAttachments>;
