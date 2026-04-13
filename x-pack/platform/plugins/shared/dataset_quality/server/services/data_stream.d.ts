import type { IndicesDataStream, IndicesDataStreamsStatsDataStreamsStatsItem } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
declare class DataStreamService {
    getMatchingDataStreams(esClient: ElasticsearchClient, datasetName: string | string[]): Promise<IndicesDataStream[]>;
    getStreamsStats(esClient: ElasticsearchClient, dataStreams: string[]): Promise<IndicesDataStreamsStatsDataStreamsStatsItem[]>;
    getDataStreamIndexSettings(esClient: ElasticsearchClient, dataStream: string): Promise<Awaited<ReturnType<ElasticsearchClient['indices']['getSettings']>>>;
}
export declare const dataStreamService: DataStreamService;
export {};
