import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { WritableSkillProvider } from '../skill_provider';
export declare const createPersistedSkillProvider: ({ space, esClient, logger, }: {
    space: string;
    esClient: ElasticsearchClient;
    logger: Logger;
}) => WritableSkillProvider;
