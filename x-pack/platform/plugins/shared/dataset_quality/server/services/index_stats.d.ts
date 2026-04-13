import type { ElasticsearchClient } from '@kbn/core/server';
interface IndexStatsResponse {
    docsCountPerDataStream: {
        [indexName: string]: number;
    };
}
declare class IndexStatsService {
    getIndicesDocCounts(esClient: ElasticsearchClient, dataStreams: string[]): Promise<IndexStatsResponse>;
}
export declare const indexStatsService: IndexStatsService;
export {};
