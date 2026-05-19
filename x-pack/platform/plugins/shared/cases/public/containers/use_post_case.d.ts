import type { CasePostRequest } from '../../common/types/api';
import type { ServerError } from '../types';
interface MutationArgs {
    request: CasePostRequest;
}
export declare const usePostCase: () => import("@kbn/react-query").UseMutationResult<import("./types").CaseUI, ServerError, MutationArgs, unknown>;
export type UsePostCase = ReturnType<typeof usePostCase>;
export {};
