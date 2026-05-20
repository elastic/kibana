import type { IndicesDataStream, IndicesIndexTemplate } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
export interface MeteringStatsResponse {
    datastreams: MeteringStats[];
}
export interface MeteringStats {
    name: string;
    num_docs: number;
    size_in_bytes: number;
}
declare class DataStreamService {
    getAllFleetDataStreams(esClient: ElasticsearchClient): Promise<IndicesDataStream[]>;
    getAllFleetMeteringStats(esClient: ElasticsearchClient): Promise<MeteringStats[]>;
    getAllFleetDataStreamsStats(esClient: ElasticsearchClient): Promise<import("@elastic/elasticsearch/lib/api/types").IndicesDataStreamsStatsDataStreamsStatsItem[]>;
    streamPartsToIndexPattern({ type, dataset }: {
        dataset: string;
        type: string;
    }): string;
    getMatchingDataStreams(esClient: ElasticsearchClient, dataStreamParts: {
        dataset: string;
        type: string;
    }): Promise<IndicesDataStream[]>;
    getMatchingIndexTemplate(esClient: ElasticsearchClient, dataStreamParts: {
        dataset: string;
        type: string;
    }): Promise<IndicesIndexTemplate | null>;
}
export declare const dataStreamService: DataStreamService;
export {};
