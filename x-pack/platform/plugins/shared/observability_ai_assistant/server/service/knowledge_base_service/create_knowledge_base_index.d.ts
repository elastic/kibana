import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
export declare function createKnowledgeBaseIndex({ esClient, logger, indexName, }: {
    esClient: {
        asInternalUser: ElasticsearchClient;
    };
    logger: Logger;
    indexName: string;
}): Promise<void>;
