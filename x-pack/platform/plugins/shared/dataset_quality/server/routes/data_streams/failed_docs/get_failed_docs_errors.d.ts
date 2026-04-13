import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
export declare function getFailedDocsErrors({ esClient, start, end, dataStream, }: {
    esClient: ElasticsearchClient;
    start: number;
    end: number;
    dataStream: string;
}): Promise<{
    errors: Array<{
        type: string;
        message: string;
    }>;
}>;
