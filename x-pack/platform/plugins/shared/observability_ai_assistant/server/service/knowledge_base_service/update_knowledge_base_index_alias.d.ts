import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
export declare function updateKnowledgeBaseWriteIndexAlias({ esClient, logger, nextWriteIndexName, currentWriteIndexName, }: {
    esClient: {
        asInternalUser: ElasticsearchClient;
    };
    logger: Logger;
    nextWriteIndexName: string;
    currentWriteIndexName: string;
}): Promise<void>;
