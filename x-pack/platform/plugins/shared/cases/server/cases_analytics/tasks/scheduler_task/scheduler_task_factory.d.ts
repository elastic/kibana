import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { ConfigType } from '../../../config';
import { SchedulerTaskRunner } from './scheduler_task_runner';
interface AnalyticsIndexSchedulerTaskFactoryParams {
    getUnsecureSavedObjectsClient: () => Promise<SavedObjectsClientContract>;
    logger: Logger;
    analyticsConfig: ConfigType['analytics'];
    getTaskManager: () => Promise<TaskManagerStartContract>;
    getESClient: () => Promise<ElasticsearchClient>;
}
export declare class AnalyticsIndexSchedulerTaskFactory {
    private readonly analyticsConfig;
    private readonly logger;
    private readonly getUnsecureSavedObjectsClient;
    private readonly getTaskManager;
    private readonly getESClient;
    constructor({ logger, getUnsecureSavedObjectsClient, analyticsConfig, getTaskManager, getESClient, }: AnalyticsIndexSchedulerTaskFactoryParams);
    create(): SchedulerTaskRunner;
}
export {};
