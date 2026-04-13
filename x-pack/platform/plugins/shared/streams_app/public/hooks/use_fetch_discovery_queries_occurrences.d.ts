export interface DiscoveryQueriesOccurrencesFetchResult {
    occurrences_histogram: Array<{
        x: number;
        y: number;
    }>;
    total_occurrences: number;
}
export declare const DISCOVERY_QUERIES_OCCURRENCES_QUERY_KEY: readonly ["discoveryQueriesOccurrences"];
export declare const useFetchDiscoveryQueriesOccurrences: (options?: {
    name?: string;
    query?: string;
} | undefined, deps?: unknown[]) => import("@kbn/react-query").UseQueryResult<DiscoveryQueriesOccurrencesFetchResult | undefined, Error>;
