import type { SignificantEventsResponse, StreamQuery } from '@kbn/streams-schema';
export interface SignificantEventQueryRow {
    query: StreamQuery;
    stream_name: string;
    occurrences: Array<{
        x: number;
        y: number;
    }>;
    change_points: SignificantEventsResponse['change_points'];
    rule_backed: boolean;
}
export interface QueriesTableFetchResult {
    queries: SignificantEventQueryRow[];
    page: number;
    perPage: number;
    total: number;
}
export declare const DISCOVERY_QUERIES_QUERY_KEY: readonly ["discoveryQueries"];
export declare const useFetchDiscoveryQueries: (options: {
    name?: string;
    query?: string;
    page: number;
    perPage: number;
}, deps?: unknown[]) => import("@kbn/react-query").UseQueryResult<QueriesTableFetchResult | undefined, Error>;
