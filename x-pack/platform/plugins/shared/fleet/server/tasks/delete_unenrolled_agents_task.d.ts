import type { CoreSetup, ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { ConcreteTaskInstance, TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { LoggerFactory } from '@kbn/core/server';
export declare const TYPE = "fleet:delete-unenrolled-agents-task";
export declare const VERSION = "1.0.1";
interface DeleteUnenrolledAgentsTaskSetupContract {
    core: CoreSetup;
    taskManager: TaskManagerSetupContract;
    logFactory: LoggerFactory;
}
interface DeleteUnenrolledAgentsTaskStartContract {
    taskManager: TaskManagerStartContract;
}
export declare class DeleteUnenrolledAgentsTask {
    private logger;
    private wasStarted;
    constructor(setupContract: DeleteUnenrolledAgentsTaskSetupContract);
    start: ({ taskManager }: DeleteUnenrolledAgentsTaskStartContract) => Promise<void>;
    private get taskId();
    private endRun;
    deleteUnenrolledAgents({ esClient, abortController, }: {
        esClient: ElasticsearchClient;
        abortController: AbortController;
    }): Promise<void>;
    isDeleteUnenrolledAgentsEnabled(soClient: SavedObjectsClientContract): Promise<boolean>;
    runTask: ({ taskInstance, core, abortController, }: {
        taskInstance: ConcreteTaskInstance;
        core: CoreSetup;
        abortController: AbortController;
    }) => Promise<{
        state: {};
        shouldDeleteTask: boolean;
    } | undefined>;
}
export {};
