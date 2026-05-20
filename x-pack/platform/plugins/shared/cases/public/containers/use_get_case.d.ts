import type { ResolvedCase } from './types';
import type { ServerError } from '../types';
export declare const useGetCase: (caseId: string) => import("@kbn/react-query").UseQueryResult<ResolvedCase, ServerError>;
export type UseGetCase = ReturnType<typeof useGetCase>;
