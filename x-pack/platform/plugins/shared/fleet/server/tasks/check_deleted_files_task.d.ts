import type { CoreSetup } from '@kbn/core/server';
import type { TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { LoggerFactory } from '@kbn/core/server';
export declare const TYPE = "fleet:check-deleted-files-task";
export declare const VERSION = "1.0.1";
interface CheckDeletedFilesTaskSetupContract {
    core: CoreSetup;
    taskManager: TaskManagerSetupContract;
    logFactory: LoggerFactory;
}
interface CheckDeletedFilesTaskStartContract {
    taskManager: TaskManagerStartContract;
}
export declare class CheckDeletedFilesTask {
    private logger;
    private wasStarted;
    constructor(setupContract: CheckDeletedFilesTaskSetupContract);
    start: ({ taskManager }: CheckDeletedFilesTaskStartContract) => Promise<void>;
    private get taskId();
    private runTask;
}
export {};
