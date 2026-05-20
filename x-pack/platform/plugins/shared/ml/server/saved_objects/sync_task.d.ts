import type { Logger, CoreStart } from '@kbn/core/server';
import type { TaskManagerSetupContract, TaskManagerStartContract, TaskInstance } from '@kbn/task-manager-plugin/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
export declare class SavedObjectsSyncService {
    private core;
    private log;
    constructor(logger: Logger);
    registerSyncTask(taskManager: TaskManagerSetupContract, security: SecurityPluginSetup | undefined, spacesEnabled: boolean, isMlReady: () => Promise<void>): void;
    scheduleSyncTask(taskManager: TaskManagerStartContract, core: CoreStart): Promise<TaskInstance | null>;
    unscheduleSyncTask(taskManager: TaskManagerStartContract): Promise<void>;
}
