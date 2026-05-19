import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import type { ConfigType } from '../../../config';
import { SynchronizationTaskRunner } from './synchronization_task_runner';
interface AnalyticsIndexSynchronizationTaskFactoryParams {
    logger: Logger;
    getESClient: () => Promise<ElasticsearchClient>;
    analyticsConfig: ConfigType['analytics'];
}
export declare class AnalyticsIndexSynchronizationTaskFactory {
    private readonly logger;
    private readonly getESClient;
    private readonly analyticsConfig;
    constructor({ logger, getESClient, analyticsConfig, }: AnalyticsIndexSynchronizationTaskFactoryParams);
    create(context: RunContext): SynchronizationTaskRunner;
}
export {};
