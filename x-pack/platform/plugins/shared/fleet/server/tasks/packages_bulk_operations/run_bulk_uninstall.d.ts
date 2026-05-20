import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { type BulkPackageOperationsTaskParams } from './utils';
export interface BulkUninstallTaskParams extends BulkPackageOperationsTaskParams {
    type: 'bulk_uninstall';
    packages: Array<{
        name: string;
        version: string;
    }>;
    force?: boolean;
}
export declare function _runBulkUninstallTask({ abortController, taskParams, logger, }: {
    taskParams: BulkUninstallTaskParams;
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
export declare function scheduleBulkUninstall(taskManagerStart: TaskManagerStartContract, taskParams: Omit<BulkUninstallTaskParams, 'type'>, request: KibanaRequest): Promise<string>;
