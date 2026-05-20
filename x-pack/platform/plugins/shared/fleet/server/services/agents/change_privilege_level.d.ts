import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { PackagePolicy } from '../../types';
import type { AgentPrivilegeLevelChangeUserInfo } from '../../../common/types';
import type { GetAgentsOptions } from './crud';
export declare function changeAgentPrivilegeLevel(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, agentId: string, options?: {
    user_info?: AgentPrivilegeLevelChangeUserInfo;
} | null): Promise<{
    message: string;
    actionId?: undefined;
} | {
    actionId: string;
    message?: undefined;
}>;
export declare function bulkChangeAgentsPrivilegeLevel(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, options: GetAgentsOptions & {
    batchSize?: number;
    actionId?: string;
    total?: number;
    user_info?: AgentPrivilegeLevelChangeUserInfo;
}): Promise<{
    actionId: string;
}>;
export declare function getPackagesWithRootPrivilege(packagePolicies: PackagePolicy[]): (import("../../../common/types").PackagePolicyPackage | undefined)[];
