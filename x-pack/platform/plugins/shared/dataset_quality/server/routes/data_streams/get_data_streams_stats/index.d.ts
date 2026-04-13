import type { ElasticsearchClient } from '@kbn/core/server';
export declare function getDataStreamsStats({ esClient, dataStreams, }: {
    esClient: ElasticsearchClient;
    dataStreams: string[];
}): Promise<Record<string, {
    size: string;
    sizeBytes: number;
    totalDocs: number;
}>>;
