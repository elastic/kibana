import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';
import type { CoreSetup, CoreStart } from '@kbn/core/server';
import type { TaskManagerStartContract } from '..';
import type { TaskScheduling } from '../task_scheduling';
import type { TaskTypeDictionary } from '../task_type_dictionary';
import type { TaskManagerPluginsStart } from '../plugin';
interface RegisterUiamApiKeyProvisioningTaskOpts {
    coreSetup: CoreSetup<TaskManagerPluginsStart, TaskManagerStartContract>;
    taskTypeDictionary: TaskTypeDictionary;
}
export declare class UiamApiKeyProvisioningTask {
    private readonly logger;
    private readonly isServerless;
    private readonly analytics;
    private readonly featureFlagScheduler;
    constructor({ logger, isServerless, analytics, }: {
        logger: Logger;
        isServerless: boolean;
        analytics: AnalyticsServiceSetup;
    });
    register(opts: RegisterUiamApiKeyProvisioningTaskOpts): void;
    start({ core, taskScheduling, removeIfExists, }: {
        core: CoreStart;
        taskScheduling: TaskScheduling;
        removeIfExists: (id: string) => Promise<void>;
    }): Promise<void>;
    stop(): void;
    private runTask;
    private reportProvisioningRunEvent;
    private getApiKeysToConvert;
    private convertApiKeys;
    private updateTasks;
    private updateProvisioningStatus;
}
export {};
