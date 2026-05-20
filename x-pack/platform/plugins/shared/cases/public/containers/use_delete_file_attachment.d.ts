import type { ServerError } from '../types';
interface MutationArgs {
    caseId: string;
    fileId: string;
}
export declare const useDeleteFileAttachment: () => import("@kbn/react-query").UseMutationResult<void, ServerError, MutationArgs, unknown>;
export {};
