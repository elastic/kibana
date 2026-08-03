import type { SupportedSavedObjectType } from './helpers';
import type { FoundSavedObject } from './types';
export interface UseFindSavedObjectsArgs {
    /** Restrict the result set to these SO types (e.g. all supported types or a single filter). */
    types: SupportedSavedObjectType[];
    /** Raw query string from the search input; an empty string disables the search clause. */
    query: string;
    /** Zero-based page index, matching `EuiTablePagination`. */
    page: number;
    perPage: number;
}
export interface UseFindSavedObjectsResult {
    items: FoundSavedObject[];
    total: number;
    pageCount: number;
    isLoading: boolean;
}
/**
 * Fetches saved objects from the management `_find` endpoint, sorted by
 * last-updated, with a wildcard-suffix search.
 */
export declare const useFindSavedObjects: ({ types, query, page, perPage, }: UseFindSavedObjectsArgs) => UseFindSavedObjectsResult;
