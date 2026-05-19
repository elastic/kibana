import type { CoreSetup } from '@kbn/core/server';
import type { ConcreteTaskInstance, TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { LoggerFactory } from '@kbn/core/server';
export declare const TYPE = "fleet:sync-integrations-task";
export declare const VERSION = "1.0.6";
interface SyncIntegrationsTaskConfig {
    taskInterval?: string;
}
interface SyncIntegrationsTaskSetupContract {
    core: CoreSetup;
    taskManager: TaskManagerSetupContract;
    logFactory: LoggerFactory;
    config: SyncIntegrationsTaskConfig;
}
interface SyncIntegrationsTaskStartContract {
    taskManager: TaskManagerStartContract;
}
export declare class SyncIntegrationsTask {
    private logger;
    private wasStarted;
    private taskInterval;
    constructor(setupContract: SyncIntegrationsTaskSetupContract);
    start: ({ taskManager }: SyncIntegrationsTaskStartContract) => Promise<void>;
    private get taskId();
    private endRun;
    runTask: (taskInstance: ConcreteTaskInstance, core: CoreSetup, abortController: AbortController) => Promise<{
        state: {};
        shouldDeleteTask: boolean;
    } | undefined>;
    private getSyncedIntegrationDoc;
    private hadAnyRemoteESSyncEnabled;
    private updateSyncedIntegrationsData;
}
export {};
