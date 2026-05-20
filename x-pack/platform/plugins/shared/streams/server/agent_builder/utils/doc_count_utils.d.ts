import type { ElasticsearchClient } from '@kbn/core/server';
/**
 * Returns the total document count for a stream within a time range.
 * Uses ES|QL COUNT(*) with a @timestamp filter — lightweight single-shard query.
 */
export declare function getDocCountInTimeRange(options: {
    esClient: ElasticsearchClient;
    streamName: string;
    start: number;
    end: number;
}): Promise<number>;
/**
 * Returns the timestamp of the most recent failure store document for a stream,
 * or null if the failure store is empty. Uses a single MAX aggregation — very cheap.
 */
export declare function getLastFailureTimestamp(options: {
    esClient: ElasticsearchClient;
    streamName: string;
}): Promise<string | null>;
