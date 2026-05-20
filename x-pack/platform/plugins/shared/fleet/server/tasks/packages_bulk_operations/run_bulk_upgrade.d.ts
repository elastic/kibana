import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { KibanaRequest, Logger } from '@kbn/core/server';
export interface BulkUpgradeTaskParams {
    type: 'bulk_upgrade';
    packages: Array<{
        name: string;
        version?: string;
    }>;
    spaceId?: string;
    force?: boolean;
    prerelease?: boolean;
    upgradePackagePolicies?: boolean;
}
export declare function _runBulkUpgradeTask({ abortController, taskParams, logger, request, }: {
    taskParams: BulkUpgradeTaskParams;
    abortController: AbortController;
    logger: Logger;
    request: KibanaRequest;
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
export declare function scheduleBulkUpgrade(taskManagerStart: TaskManagerStartContract, taskParams: Omit<BulkUpgradeTaskParams, 'type'>, request: KibanaRequest): Promise<string>;
