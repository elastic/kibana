import { type CoreStart, type Logger } from '@kbn/core/server';
import { type TaskManagerSetupContract, type TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { ConfigType } from '../../config';
export declare const CASES_INCREMENTAL_ID_SYNC_TASK_TYPE = "cases_incremental_id_assignment";
export declare const CASES_INCREMENTAL_ID_SYNC_TASK_ID = "cases:cases_incremental_id_assignment";
export declare const CasesIncrementIdTaskVersion = "1.0.0";
export declare class IncrementalIdTaskManager {
    private config;
    private logger;
    private internalSavedObjectsClient?;
    private taskManager?;
    private successErrorUsageCounter?;
    constructor(taskManager: TaskManagerSetupContract, config: ConfigType['incrementalId'], logger: Logger, usageCollection?: UsageCollectionSetup);
    setupIncrementIdTask(taskManager: TaskManagerStartContract, core: CoreStart): Promise<void>;
}
