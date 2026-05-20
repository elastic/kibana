import type { ServerError } from '../types';
interface UpdateComment {
    caseId: string;
    commentId: string;
    commentUpdate: string;
    version: string;
}
export declare const useUpdateComment: () => import("@kbn/react-query").UseMutationResult<import("./types").CaseUI, ServerError, UpdateComment, unknown>;
export type UseUpdateComment = ReturnType<typeof useUpdateComment>;
export {};
