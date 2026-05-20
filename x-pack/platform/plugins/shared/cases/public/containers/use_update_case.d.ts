import type { ServerError } from '../types';
import type { UpdateByKey } from './types';
export declare const useUpdateCase: () => import("@kbn/react-query").UseMutationResult<import("./types").CasesUI, ServerError, UpdateByKey, unknown>;
export type UseUpdateCase = ReturnType<typeof useUpdateCase>;
