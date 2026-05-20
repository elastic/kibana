import { type SavedObjectsClientContract } from '@kbn/core/server';
import type { CoreSetup, ElasticsearchClient } from '@kbn/core/server';
import type { ConcreteTaskInstance, TaskManagerStartContract, TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { ActionParams } from './action_runner';
import type { RetryParams } from './retry_helper';
import { BulkActionTaskType } from './bulk_action_types';
/**
 * Create and run retry tasks of agent bulk actions
 */
export declare class BulkActionsResolver {
    private taskManager?;
    createTaskRunner(core: CoreSetup, taskType: BulkActionTaskType): ({ taskInstance }: {
        taskInstance: ConcreteTaskInstance;
    }) => {
        run(): Promise<void>;
        cancel(): Promise<void>;
    };
    constructor(taskManager: TaskManagerSetupContract, core: CoreSetup);
    start(taskManager: TaskManagerStartContract): Promise<void>;
    getTaskId(actionId: string, type: string): string;
    run(actionParams: ActionParams, retryParams: RetryParams, taskType: string, taskId: string, runAt?: Date): Promise<string>;
    removeIfExists(taskId: string): Promise<void>;
}
export declare function createRetryTask(taskInstance: ConcreteTaskInstance, getDeps: () => Promise<{
    esClient: ElasticsearchClient;
    soClient: SavedObjectsClientContract;
}>, doRetry: (esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, actionParams: ActionParams, retryParams: RetryParams) => void): {
    run(): Promise<void>;
    cancel(): Promise<void>;
};
