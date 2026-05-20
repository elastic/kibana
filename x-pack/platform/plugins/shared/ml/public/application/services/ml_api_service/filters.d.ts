import type { Filter, FilterStats } from '@kbn/ml-common-types/filters';
import type { HttpService } from '../http_service';
export declare const filtersApiProvider: (httpService: HttpService) => {
    filters(obj?: {
        filterId?: string;
    }): Promise<Filter[]>;
    filtersStats(): Promise<FilterStats[]>;
    addFilter(filterId: string, description: string, items: string[]): Promise<Filter>;
    updateFilter(filterId: string, description: string, addItems: string[], removeItems: string[]): Promise<Filter>;
    deleteFilter(filterId: string): Promise<{
        acknowledged: boolean;
    }>;
};
export type FiltersApiService = ReturnType<typeof filtersApiProvider>;
/**
 * Hooks for accessing {@link FiltersApiService} in React components.
 */
export declare function useFiltersApiService(): FiltersApiService;
