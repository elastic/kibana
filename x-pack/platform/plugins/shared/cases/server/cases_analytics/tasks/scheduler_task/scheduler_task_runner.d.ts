import { type TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { SavedObjectsClientContract, Logger, ElasticsearchClient } from '@kbn/core/server';
import type { CancellableTask } from '@kbn/task-manager-plugin/server/task';
import type { ConfigType } from '../../../config';
interface SchedulerTaskRunnerFactoryConstructorParams {
    getUnsecureSavedObjectsClient: () => Promise<SavedObjectsClientContract>;
    logger: Logger;
    analyticsConfig: ConfigType['analytics'];
    getTaskManager: () => Promise<TaskManagerStartContract>;
    getESClient: () => Promise<ElasticsearchClient>;
}
export declare class SchedulerTaskRunner implements CancellableTask {
    private readonly getUnsecureSavedObjectsClient;
    private readonly logger;
    private readonly analyticsConfig;
    private readonly getTaskManager;
    private readonly getESClient;
    constructor({ getUnsecureSavedObjectsClient, logger, analyticsConfig, getTaskManager, getESClient, }: SchedulerTaskRunnerFactoryConstructorParams);
    run(): Promise<void>;
    cancel(): Promise<void>;
}
export {};
