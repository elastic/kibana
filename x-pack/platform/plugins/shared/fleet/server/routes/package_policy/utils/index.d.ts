import type { TypeOf } from '@kbn/config-schema';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { CreatePackagePolicyRequestSchema, PackagePolicy, PackagePolicyInput, NewPackagePolicyInput } from '../../../types';
import type { SimplifiedPackagePolicy } from '../../../../common/services/simplified_package_policy_helper';
export declare function isSimplifiedCreatePackagePolicyRequest(body: Omit<TypeOf<typeof CreatePackagePolicyRequestSchema.body>, 'force' | 'package'>): body is SimplifiedPackagePolicy;
export declare function removeFieldsFromInputSchema(packagePolicyInputs: PackagePolicyInput[]): PackagePolicyInput[];
/**
 * If an agentless agent policy is associated with the package policy,
 * it will rename the agentless agent policy of a package policy to keep it in sync with the package policy name.
 */
export declare function renameAgentlessAgentPolicy(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, packagePolicy: PackagePolicy, name: string): Promise<void>;
/**
 *
 * Check if one input is enabled but all of its streams are disabled
 * If true, switch input.enabled to false
 */
export declare function alignInputsAndStreams(packagePolicyInputs: PackagePolicyInput[] | NewPackagePolicyInput[]): NewPackagePolicyInput[];
