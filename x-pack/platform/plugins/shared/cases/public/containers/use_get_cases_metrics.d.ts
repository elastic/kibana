import type { ServerError } from '../types';
export declare const useGetCasesMetrics: () => import("@kbn/react-query").UseQueryResult<{
    mttr?: number | null | undefined;
    status?: {
        open: number;
        inProgress: number;
        closed: number;
    } | undefined;
}, ServerError>;
export type UseGetCasesMetrics = ReturnType<typeof useGetCasesMetrics>;
