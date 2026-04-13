export declare const UNBACKED_QUERIES_COUNT_QUERY_KEY: readonly ["unbackedQueriesCount"];
export declare function useUnbackedQueriesCount(): {
    count: number;
    isLoading: boolean;
    refetch: <TPageData>(options?: (import("@kbn/react-query").RefetchOptions & import("@kbn/react-query").RefetchQueryFilters<TPageData>) | undefined) => Promise<import("@kbn/react-query").QueryObserverResult<{
        count: number;
    }, unknown>>;
    query: import("@kbn/react-query").UseQueryResult<{
        count: number;
    }, unknown>;
};
