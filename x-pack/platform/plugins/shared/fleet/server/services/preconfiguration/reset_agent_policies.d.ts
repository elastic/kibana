import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
export declare function resetPreconfiguredAgentPolicies(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, agentPolicyId?: string): Promise<void>;
