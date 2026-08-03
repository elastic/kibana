import type { ServerError } from '../types';
interface MutationArgs {
    caseId: string;
    fileId: string;
}
export declare const useDeleteFileAttachment: () => import("@tanstack/react-query").UseMutationResult<void, ServerError, MutationArgs, {
    previousStats: [import("@tanstack/query-core").QueryKey, {
        total: number;
    } | undefined][];
}>;
export {};
