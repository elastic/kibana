import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
export declare function unenrollForAgentPolicyId(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, policyId: string, options?: {
    revoke?: boolean;
}): Promise<void>;
