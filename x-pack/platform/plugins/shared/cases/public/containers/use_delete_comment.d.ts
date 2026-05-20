import type { ServerError } from '../types';
interface MutationArgs {
    caseId: string;
    commentId: string;
    successToasterTitle: string;
}
export declare const useDeleteComment: () => import("@kbn/react-query").UseMutationResult<void, ServerError, MutationArgs, unknown>;
export type UseDeleteComment = ReturnType<typeof useDeleteComment>;
export {};
