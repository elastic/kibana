import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { CoreSetup } from '@kbn/core/server';
import type { ObservabilityAIAssistantPluginStartDependencies } from '../../types';
export declare const KB_REINDEXING_LOCK_ID = "observability_ai_assistant:kb_reindexing";
export declare function reIndexKnowledgeBaseWithLock({ core, logger, esClient, }: {
    core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
    logger: Logger;
    esClient: {
        asInternalUser: ElasticsearchClient;
    };
}): Promise<void>;
export declare function getNextWriteIndexName(currentWriteIndexName: string | undefined): string | undefined;
export declare function getActiveReindexingTaskId(esClient: {
    asInternalUser: ElasticsearchClient;
}): Promise<string | undefined>;
export declare function isReIndexInProgress({ esClient, logger, core, }: {
    esClient: {
        asInternalUser: ElasticsearchClient;
    };
    logger: Logger;
    core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
}): Promise<boolean>;
