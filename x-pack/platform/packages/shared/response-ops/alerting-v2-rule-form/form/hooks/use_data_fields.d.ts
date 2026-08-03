import type { HttpStart } from '@kbn/core/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataViewFieldMap } from '@kbn/data-views-plugin/common';
import type { ISearchGeneric } from '@kbn/search-types';
interface UseDataFieldsProps {
    query: string;
    http: HttpStart;
    dataViews: DataViewsPublicPluginStart;
    onSuccess?: (fields: DataViewFieldMap) => void;
    /**
     * When provided, ES|QL column introspection (`LIMIT 0`) is used for field discovery
     * instead of the DataView field-caps API. Preferred for all ES|QL sources because it
     * reflects the actual schema the query will return; required for federated datasets
     * that don't exist as Elasticsearch indices and therefore can't be introspected via
     * field-caps.
     */
    search?: ISearchGeneric;
}
export declare const useDataFields: ({ query, http, dataViews, onSuccess, search, }: UseDataFieldsProps) => {
    data: DataViewFieldMap;
    isLoading: boolean;
    error: unknown;
    isError: true;
    isLoadingError: false;
    isRefetchError: true;
    isSuccess: false;
    status: "error";
    dataUpdatedAt: number;
    errorUpdatedAt: number;
    failureCount: number;
    failureReason: unknown;
    errorUpdateCount: number;
    isFetched: boolean;
    isFetchedAfterMount: boolean;
    isFetching: boolean;
    isInitialLoading: boolean;
    isPaused: boolean;
    isPlaceholderData: boolean;
    isPreviousData: boolean;
    isRefetching: boolean;
    isStale: boolean;
    refetch: <TPageData>(options?: (import("@tanstack/query-core").RefetchOptions & import("@tanstack/query-core").RefetchQueryFilters<TPageData>) | undefined) => Promise<import("@tanstack/query-core").QueryObserverResult<DataViewFieldMap, unknown>>;
    remove: () => void;
    fetchStatus: import("@tanstack/query-core").FetchStatus;
} | {
    data: DataViewFieldMap;
    isLoading: boolean;
    error: null;
    isError: false;
    isLoadingError: false;
    isRefetchError: false;
    isSuccess: true;
    status: "success";
    dataUpdatedAt: number;
    errorUpdatedAt: number;
    failureCount: number;
    failureReason: unknown;
    errorUpdateCount: number;
    isFetched: boolean;
    isFetchedAfterMount: boolean;
    isFetching: boolean;
    isInitialLoading: boolean;
    isPaused: boolean;
    isPlaceholderData: boolean;
    isPreviousData: boolean;
    isRefetching: boolean;
    isStale: boolean;
    refetch: <TPageData>(options?: (import("@tanstack/query-core").RefetchOptions & import("@tanstack/query-core").RefetchQueryFilters<TPageData>) | undefined) => Promise<import("@tanstack/query-core").QueryObserverResult<DataViewFieldMap, unknown>>;
    remove: () => void;
    fetchStatus: import("@tanstack/query-core").FetchStatus;
} | {
    data: DataViewFieldMap;
    isLoading: boolean;
    error: unknown;
    isError: true;
    isLoadingError: true;
    isRefetchError: false;
    isSuccess: false;
    status: "error";
    dataUpdatedAt: number;
    errorUpdatedAt: number;
    failureCount: number;
    failureReason: unknown;
    errorUpdateCount: number;
    isFetched: boolean;
    isFetchedAfterMount: boolean;
    isFetching: boolean;
    isInitialLoading: boolean;
    isPaused: boolean;
    isPlaceholderData: boolean;
    isPreviousData: boolean;
    isRefetching: boolean;
    isStale: boolean;
    refetch: <TPageData>(options?: (import("@tanstack/query-core").RefetchOptions & import("@tanstack/query-core").RefetchQueryFilters<TPageData>) | undefined) => Promise<import("@tanstack/query-core").QueryObserverResult<DataViewFieldMap, unknown>>;
    remove: () => void;
    fetchStatus: import("@tanstack/query-core").FetchStatus;
} | {
    data: DataViewFieldMap;
    isLoading: boolean;
    error: null;
    isError: false;
    isLoadingError: false;
    isRefetchError: false;
    isSuccess: false;
    status: "loading";
    dataUpdatedAt: number;
    errorUpdatedAt: number;
    failureCount: number;
    failureReason: unknown;
    errorUpdateCount: number;
    isFetched: boolean;
    isFetchedAfterMount: boolean;
    isFetching: boolean;
    isInitialLoading: boolean;
    isPaused: boolean;
    isPlaceholderData: boolean;
    isPreviousData: boolean;
    isRefetching: boolean;
    isStale: boolean;
    refetch: <TPageData>(options?: (import("@tanstack/query-core").RefetchOptions & import("@tanstack/query-core").RefetchQueryFilters<TPageData>) | undefined) => Promise<import("@tanstack/query-core").QueryObserverResult<DataViewFieldMap, unknown>>;
    remove: () => void;
    fetchStatus: import("@tanstack/query-core").FetchStatus;
};
export {};
