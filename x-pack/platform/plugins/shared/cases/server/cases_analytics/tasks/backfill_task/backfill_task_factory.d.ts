import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import type { ConfigType } from '../../../config';
import { BackfillTaskRunner } from './backfill_task_runner';
interface CaseAnalyticsIndexBackfillTaskFactoryParams {
    logger: Logger;
    getESClient: () => Promise<ElasticsearchClient>;
    analyticsConfig: ConfigType['analytics'];
}
export declare class CaseAnalyticsIndexBackfillTaskFactory {
    private readonly logger;
    private readonly getESClient;
    private readonly analyticsConfig;
    constructor({ logger, getESClient, analyticsConfig, }: CaseAnalyticsIndexBackfillTaskFactoryParams);
    create(context: RunContext): BackfillTaskRunner;
}
export {};
