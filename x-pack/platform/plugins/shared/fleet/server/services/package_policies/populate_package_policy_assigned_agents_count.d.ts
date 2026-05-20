import type { ElasticsearchClient } from '@kbn/core/server';
import type { PackagePolicy } from '../../../common';
/**
 * Mutates each of the Package Policies passed on input and adds `agents` property to it with the
 * count of agents currently using the given agent policy.
 * @param esClient
 * @param packagePolicies
 */
export declare const populatePackagePolicyAssignedAgentsCount: (esClient: ElasticsearchClient, packagePolicies: PackagePolicy[]) => Promise<void>;
