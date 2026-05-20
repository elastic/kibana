import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { UpgradePackagePolicyDryRunResponseItem } from '../../../common/types';
export interface UpgradeManagedPackagePoliciesResult {
    packagePolicyId: string;
    diff?: UpgradePackagePolicyDryRunResponseItem['diff'];
    errors: any;
}
export declare function registerUpgradeManagedPackagePoliciesTask(taskManagerSetup: TaskManagerSetupContract): void;
/**
 *
 * @param soClient
 * @param esClient
 * @returns
 */
export declare const setupUpgradeManagedPackagePolicies: (soClient: SavedObjectsClientContract) => Promise<void>;
/**
 * Upgrade any package policies for packages installed through setup that are denoted as `AUTO_UPGRADE` packages
 * or have the `keep_policies_up_to_date` flag set to `true`
 */
export declare const upgradeManagedPackagePolicies: (soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, pkgName: string) => Promise<UpgradeManagedPackagePoliciesResult[]>;
