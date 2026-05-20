import type { ElasticsearchClient } from '@kbn/core/server';
import type { StreamDocsStat } from '../../../../common';
/**
 * Fetches total document counts for one or all streams.
 *
 * The current implementation no longer uses a time range. Instead it:
 * 1) calls the indices.getDataStream API to resolve data streams and their backing indices
 * 2) prefers the _metering/stats API (ES3 / serverless) to get total doc counts per data stream
 * 3) falls back to the indices.stats docs metric (stateful) when _metering/stats is unavailable
 */
export declare function getDocCountsForStreams(options: {
    isServerless: boolean;
    esClient: ElasticsearchClient;
    /**
     * When available (serverless), this client should be used to call the
     * _metering/stats API as a secondary auth user to ensure proper permissions.
     */
    esClientAsSecondaryAuthUser?: ElasticsearchClient;
    /**
     * When provided, limits the computation to a single stream name.
     * When omitted, doc counts are returned for all streams.
     */
    streamName?: string;
}): Promise<StreamDocsStat[]>;
/**
 * Fetches degraded document counts for one or all streams.
 *
 * For each stream we:
 * 1) resolve the data stream and its backing indices via indices.getDataStream
 * 2) pick the last backing index
 * 3) run a search against that index with an _ignored exists query
 */
export declare function getDegradedDocCountsForStreams(options: {
    esClient: ElasticsearchClient;
    /**
     * When provided, limits the computation to a single stream name.
     * When omitted, degraded counts are returned for all streams.
     */
    streamName?: string;
}): Promise<StreamDocsStat[]>;
/**
 * Fetches failed document counts for one or all streams.
 *
 * The implementation:
 * 1) resolves failure store data streams and their backing indices via indices.getDataStream
 * 2) runs an ES|QL query over the failure store streams to get failed doc counts per backing index
 * 3) aggregates failed doc counts across backing indices for each original stream
 */
export declare function getFailedDocCountsForStreams(options: {
    esClient: ElasticsearchClient;
    start: number;
    end: number;
    /**
     * When provided, limits the computation to a single stream name.
     * When omitted, failed counts are returned for all streams.
     */
    streamName?: string;
}): Promise<StreamDocsStat[]>;
