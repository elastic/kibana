import type { FileJSON } from '@kbn/shared-ux-file-types';
import type { UseQueryResult } from '@kbn/react-query';
export interface CaseFilesFilteringOptions {
    page: number;
    perPage: number;
    searchTerm?: string;
}
export interface GetCaseFilesParams extends CaseFilesFilteringOptions {
    caseId: string;
}
export declare const useGetCaseFiles: ({ caseId, page, perPage, searchTerm, }: GetCaseFilesParams) => UseQueryResult<{
    files: FileJSON[];
    total: number;
}>;
