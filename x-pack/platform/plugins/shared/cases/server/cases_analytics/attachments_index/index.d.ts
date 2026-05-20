import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { Owner } from '../../../common/constants/types';
import { AnalyticsIndex } from '../analytics_index';
export declare const createAttachmentsAnalyticsIndex: ({ esClient, logger, isServerless, taskManager, spaceId, owner, }: {
    esClient: ElasticsearchClient;
    logger: Logger;
    isServerless: boolean;
    taskManager: TaskManagerStartContract;
    spaceId: string;
    owner: Owner;
}) => AnalyticsIndex;
