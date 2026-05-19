import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { FleetServerPolicy, FullAgentPolicy } from '../../types';
import type { PackageInfo, PackagePolicyAssetsMap } from '../../../common/types';
export declare function getAgentVersionsForVersionSpecificPolicies(): Promise<string[]>;
export declare function getVersionSpecificPolicies(soClient: SavedObjectsClientContract, fleetServerPolicy: FleetServerPolicy, fullPolicy: FullAgentPolicy, agentVersions?: string[]): Promise<FleetServerPolicy[]>;
export declare function hasAgentVersionConditionInInputTemplate(assetsMap: PackagePolicyAssetsMap): boolean;
export declare function hasAgentVersionCondition(pkgInfo: PackageInfo, assetsMap: PackagePolicyAssetsMap): boolean;
