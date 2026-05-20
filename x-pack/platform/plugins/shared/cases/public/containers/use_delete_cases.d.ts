import type { ServerError } from '../types';
interface MutationArgs {
    caseIds: string[];
    successToasterTitle: string;
}
export declare const useDeleteCases: () => import("@kbn/react-query").UseMutationResult<string, ServerError, MutationArgs, unknown>;
export type UseDeleteCases = ReturnType<typeof useDeleteCases>;
export {};
