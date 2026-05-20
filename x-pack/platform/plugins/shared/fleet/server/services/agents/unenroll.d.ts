import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { Agent } from '../../types';
import type { GetAgentsOptions } from './crud';
export declare function unenrollAgent(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, agentId: string, options?: {
    force?: boolean;
    skipAgentlessValidation?: boolean;
    revoke?: boolean;
}): Promise<void>;
export declare function unenrollAgents(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, options: GetAgentsOptions & {
    force?: boolean;
    revoke?: boolean;
    batchSize?: number;
    showInactive?: boolean;
}): Promise<{
    actionId: string;
}>;
export declare function forceUnenrollAgent(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, agentIdOrAgent: string | Agent): Promise<void>;
