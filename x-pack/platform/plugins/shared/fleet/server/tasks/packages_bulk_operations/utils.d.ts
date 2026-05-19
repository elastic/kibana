import type { KibanaRequest } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
export declare const TASK_TYPE = "fleet:packages-bulk-operations";
export declare const TASK_TITLE = "Fleet packages bulk operations";
export declare const TASK_TIMEOUT = "10m";
export interface BulkPackageOperationsTaskState {
    isDone?: boolean;
    error?: {
        message: string;
    };
    results?: Array<{
        success: true;
        name: string;
    } | {
        success: false;
        name: string;
        error: {
            message: string;
        };
    }>;
    [k: string]: unknown;
}
export interface BulkPackageOperationsTaskParams {
    type: 'bulk_upgrade' | 'bulk_uninstall' | 'bulk_rollback';
}
export declare function scheduleBulkOperationTask(taskManagerStart: TaskManagerStartContract, taskParams: BulkPackageOperationsTaskParams, request: KibanaRequest): Promise<string>;
export declare function getBulkOperationTaskResults(taskManagerStart: TaskManagerStartContract, id: string): Promise<{
    status: string;
    error: {
        message: string;
    } | undefined;
    results: ({
        success: true;
        name: string;
    } | {
        success: false;
        name: string;
        error: {
            message: string;
        };
    })[] | undefined;
}>;
export declare function formatError(err: Error): {
    message: string;
};
