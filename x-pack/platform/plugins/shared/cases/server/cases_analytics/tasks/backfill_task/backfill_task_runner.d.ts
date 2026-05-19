import type { Logger } from '@kbn/logging';
import { type ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { CancellableTask } from '@kbn/task-manager-plugin/server/task';
import type { ConfigType } from '../../../config';
interface BackfillTaskRunnerFactoryConstructorParams {
    taskInstance: ConcreteTaskInstance;
    getESClient: () => Promise<ElasticsearchClient>;
    logger: Logger;
    analyticsConfig: ConfigType['analytics'];
}
export declare class BackfillTaskRunner implements CancellableTask {
    private readonly sourceIndex;
    private readonly destIndex;
    private readonly sourceQuery;
    private readonly getESClient;
    private readonly logger;
    private readonly errorSource;
    private readonly analyticsConfig;
    constructor({ taskInstance, getESClient, logger, analyticsConfig, }: BackfillTaskRunnerFactoryConstructorParams);
    run(): Promise<{
        state: {};
    } | undefined>;
    cancel(): Promise<void>;
    private backfillReindex;
    private getPainlessScript;
    private getPainlessScriptId;
    private getCurrentMapping;
    private waitForDestIndex;
    logDebug(message: string): void;
    getErrorMessage(message: string): string;
}
export {};
