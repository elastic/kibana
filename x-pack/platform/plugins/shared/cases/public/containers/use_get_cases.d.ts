import type { UseQueryResult } from '@kbn/react-query';
import type { CasesFindResponseUI, FilterOptions, QueryParams } from './types';
export declare const initialData: CasesFindResponseUI;
export declare const useGetCases: (params?: {
    queryParams?: Partial<QueryParams>;
    filterOptions?: Partial<FilterOptions>;
}) => UseQueryResult<CasesFindResponseUI>;
