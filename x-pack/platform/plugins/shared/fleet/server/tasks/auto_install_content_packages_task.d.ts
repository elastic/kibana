import { type CoreSetup } from '@kbn/core/server';
import type { ConcreteTaskInstance, TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { LoggerFactory } from '@kbn/core/server';
export declare const TYPE = "fleet:auto-install-content-packages-task";
export declare const VERSION = "1.0.3";
interface AutoInstallContentPackagesTaskConfig {
    taskInterval?: string;
}
interface AutoInstallContentPackagesTaskSetupContract {
    core: CoreSetup;
    taskManager: TaskManagerSetupContract;
    logFactory: LoggerFactory;
    config: AutoInstallContentPackagesTaskConfig;
}
interface AutoInstallContentPackagesTaskStartContract {
    taskManager: TaskManagerStartContract;
}
export declare class AutoInstallContentPackagesTask {
    private logger;
    private wasStarted;
    private taskInterval;
    private discoveryMap?;
    private discoveryMapLastFetched;
    private lastPrerelease;
    constructor(setupContract: AutoInstallContentPackagesTaskSetupContract);
    start: ({ taskManager }: AutoInstallContentPackagesTaskStartContract) => Promise<void>;
    private get taskId();
    private endRun;
    runTask: (taskInstance: ConcreteTaskInstance, core: CoreSetup) => Promise<{
        state: {};
        shouldDeleteTask: boolean;
    } | undefined>;
    private installPackages;
    private getPackagesToInstall;
    private getDatasetsWithData;
    private getContentPackagesDiscoveryMap;
}
export {};
