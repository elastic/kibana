import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { FailureStoreStatsResponse } from '@kbn/streams-schema/src/models/ingest/failure_store';
export declare function getClusterDefaultFailureStoreRetentionValue({ esClient, isServerless, }: {
    esClient: ElasticsearchClient;
    isServerless: boolean;
}): Promise<string | undefined>;
export declare function getFailureStoreStats({ name, esClient, esClientAsSecondaryAuthUser, isServerless, }: {
    name: string;
    esClient: ElasticsearchClient;
    esClientAsSecondaryAuthUser?: ElasticsearchClient;
    isServerless: boolean;
}): Promise<FailureStoreStatsResponse>;
