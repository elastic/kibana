import type { IndicesGetDataStreamResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
/**
 * Returns a mapping from data stream name to its last backing index name.
 */
export declare function getLastBackingIndexByStream(dataStreams: IndicesGetDataStreamResponse['data_streams']): Map<string, string>;
/**
 * Runs an async operation over a list of string items in byte-size-safe chunks.
 */
export declare function processAsyncInChunks<T extends string, R>({ items, processChunk, }: {
    items: T[];
    processChunk: (chunk: T[]) => Promise<R>;
}): Promise<R[]>;
/**
 * Fetches metering statistics for a list of data streams using the
 * `/_metering/stats` API, handling large inputs by chunking requests.
 */
export declare function getDataStreamsMeteringStats({ esClient, dataStreams, }: {
    esClient: ElasticsearchClient;
    dataStreams: string[];
}): Promise<Record<string, {
    size?: string;
    sizeBytes: number;
    totalDocs: number;
}>>;
