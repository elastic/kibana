import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import type { UseAlertingEpisodesDataViewOptions } from './use_alerting_episodes_data_view';
import { type AlertEpisode, type EpisodesFilterState, type EpisodesSortState } from '../queries/episodes_query';
export interface UseFetchAlertingEpisodesQueryOptions {
    pageSize: number;
    filterState?: EpisodesFilterState;
    sortState?: EpisodesSortState;
    timeRange?: TimeRange | null;
    services: UseAlertingEpisodesDataViewOptions['services'] & {
        expressions: ExpressionsStart;
    };
}
/**
 * Hook to fetch alerting episodes data with filters and sort.
 * Returns an ad-hoc data view too, constructed from the query columns.
 *
 * Deactivation state is resolved server-side in the ESQL query via an
 * `effective_status` column, so no separate pre-fetch is needed.
 */
export declare const useFetchAlertingEpisodesQuery: ({ pageSize, services, filterState, sortState, timeRange, }: UseFetchAlertingEpisodesQueryOptions) => {
    dataView: import("@kbn/data-views-plugin/common").DataView | undefined;
    data: AlertEpisode[];
    error: unknown;
    isError: true;
    isLoading: false;
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
    refetch: <TPageData>(options?: (import("@kbn/react-query").RefetchOptions & import("@kbn/react-query").RefetchQueryFilters<TPageData>) | undefined) => Promise<import("@kbn/react-query").QueryObserverResult<AlertEpisode[], unknown>>;
    remove: () => void;
    fetchStatus: import("@kbn/react-query").FetchStatus;
} | {
    dataView: import("@kbn/data-views-plugin/common").DataView | undefined;
    data: AlertEpisode[];
    error: null;
    isError: false;
    isLoading: false;
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
    refetch: <TPageData>(options?: (import("@kbn/react-query").RefetchOptions & import("@kbn/react-query").RefetchQueryFilters<TPageData>) | undefined) => Promise<import("@kbn/react-query").QueryObserverResult<AlertEpisode[], unknown>>;
    remove: () => void;
    fetchStatus: import("@kbn/react-query").FetchStatus;
} | {
    dataView: import("@kbn/data-views-plugin/common").DataView | undefined;
    data: undefined;
    error: unknown;
    isError: true;
    isLoading: false;
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
    refetch: <TPageData>(options?: (import("@kbn/react-query").RefetchOptions & import("@kbn/react-query").RefetchQueryFilters<TPageData>) | undefined) => Promise<import("@kbn/react-query").QueryObserverResult<AlertEpisode[], unknown>>;
    remove: () => void;
    fetchStatus: import("@kbn/react-query").FetchStatus;
} | {
    dataView: import("@kbn/data-views-plugin/common").DataView | undefined;
    data: undefined;
    error: null;
    isError: false;
    isLoading: true;
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
    refetch: <TPageData>(options?: (import("@kbn/react-query").RefetchOptions & import("@kbn/react-query").RefetchQueryFilters<TPageData>) | undefined) => Promise<import("@kbn/react-query").QueryObserverResult<AlertEpisode[], unknown>>;
    remove: () => void;
    fetchStatus: import("@kbn/react-query").FetchStatus;
};
