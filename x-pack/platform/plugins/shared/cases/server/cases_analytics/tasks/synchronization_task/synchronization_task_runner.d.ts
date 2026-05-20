import type { Logger } from '@kbn/logging';
import { type ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { CancellableTask } from '@kbn/task-manager-plugin/server/task';
import type { ConfigType } from '../../../config';
interface SynchronizationTaskRunnerFactoryConstructorParams {
    taskInstance: ConcreteTaskInstance;
    getESClient: () => Promise<ElasticsearchClient>;
    logger: Logger;
    analyticsConfig: ConfigType['analytics'];
}
interface SynchronizationTaskState {
    lastSyncSuccess?: string;
    lastSyncAttempt?: string;
    esReindexTaskId?: TaskId;
}
export declare class SynchronizationTaskRunner implements CancellableTask {
    private readonly owner;
    private readonly spaceId;
    private readonly getESClient;
    private readonly previousTaskState?;
    private readonly logger;
    private readonly analyticsConfig;
    constructor({ taskInstance, getESClient, logger, analyticsConfig, }: SynchronizationTaskRunnerFactoryConstructorParams);
    run(): Promise<{
        state: {
            cai_attachments_sync?: SynchronizationTaskState | undefined;
            cai_cases_sync?: SynchronizationTaskState | undefined;
            cai_comments_sync?: SynchronizationTaskState | undefined;
            cai_activity_sync?: SynchronizationTaskState | undefined;
        };
    } | undefined>;
    cancel(): Promise<void>;
}
export {};
