import type { ElasticsearchClient } from '@kbn/core/server';
export declare function getDataStreamDefaultRetentionPeriod({ esClient, }: {
    esClient: ElasticsearchClient;
}): Promise<string | undefined>;
