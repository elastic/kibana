import type { UseQueryResult } from '@kbn/react-query';
interface GetCaseFileStatsParams {
    caseId: string;
    searchTerm?: string;
}
export declare const useGetCaseFileStats: ({ caseId, searchTerm, }: GetCaseFileStatsParams) => UseQueryResult<{
    total: number;
}>;
export {};
