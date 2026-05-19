import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { KibanaRequest, Logger } from '@kbn/core/server';
export interface BulkRollbackTaskParams {
    type: 'bulk_rollback';
    packages: Array<{
        name: string;
    }>;
    spaceId?: string;
    packagePolicyIdsForCurrentUser: {
        [packageName: string]: string[];
    };
}
export declare function _runBulkRollbackTask({ abortController, taskParams, logger, }: {
    taskParams: BulkRollbackTaskParams;
    abortController: AbortController;
    logger: Logger;
}): Promise<({
    success: true;
    name: string;
} | {
    success: false;
    name: string;
    error: {
        message: string;
    };
})[]>;
export declare function scheduleBulkRollback(taskManagerStart: TaskManagerStartContract, taskParams: Omit<BulkRollbackTaskParams, 'type'>, request: KibanaRequest): Promise<string>;
