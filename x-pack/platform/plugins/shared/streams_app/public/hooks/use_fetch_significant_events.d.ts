import type { SignificantEventsResponse, StreamQuery } from '@kbn/streams-schema';
export interface SignificantEventItem {
    query: StreamQuery;
    stream_name: string;
    occurrences: Array<{
        x: number;
        y: number;
    }>;
    change_points: SignificantEventsResponse['change_points'];
    rule_backed: boolean;
}
type SignificantEventsFetchResult = undefined | {
    significant_events: SignificantEventItem[];
    aggregated_occurrences: {
        x: number;
        y: number;
    }[];
    total_occurrences: number;
};
export declare const useFetchSignificantEvents: (options?: {
    name?: string;
    query?: string;
    ruleBacked?: boolean;
} | undefined, deps?: unknown[]) => import("@kbn/react-query").UseQueryResult<SignificantEventsFetchResult, Error>;
export {};
