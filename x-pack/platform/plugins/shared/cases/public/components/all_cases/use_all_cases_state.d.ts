import type { FilterOptions, QueryParams } from '../../../common/ui/types';
interface UseAllCasesStateReturn {
    filterOptions: FilterOptions;
    setQueryParams: (queryParam: Partial<QueryParams>) => void;
    setFilterOptions: (filterOptions: Partial<FilterOptions>) => void;
    queryParams: QueryParams;
}
export declare function useAllCasesState(isModalView?: boolean): UseAllCasesStateReturn;
export {};
