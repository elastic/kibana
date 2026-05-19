import type { UseQueryResult } from '@kbn/react-query';
import type { CasesSimilarResponseUI } from './types';
export declare const initialData: CasesSimilarResponseUI;
export declare const useGetSimilarCases: (params: {
    caseId: string;
    perPage: number;
    page: number;
    enabled: boolean;
}) => UseQueryResult<CasesSimilarResponseUI>;
