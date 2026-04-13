import type { ElasticsearchClient } from '@kbn/core/server';
export interface MeteringStatsResponse {
    datastreams: Array<{
        name: string;
        num_docs: number;
        size_in_bytes: number;
    }>;
}
export declare function getDataStreamsMeteringStats({ esClient, dataStreams, }: {
    esClient: ElasticsearchClient;
    dataStreams: string[];
}): Promise<Record<string, {
    size?: string;
    sizeBytes: number;
    totalDocs: number;
}>>;
