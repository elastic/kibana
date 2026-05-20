import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';
import type { Agent } from '../../types';
import type { GetAgentsOptions } from '.';
export declare function reassignAgent(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, agentId: string, newAgentPolicyId: string): Promise<void>;
export declare function reassignAgents(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, options: ({
    agents: Agent[];
} | GetAgentsOptions) & {
    force?: boolean;
    batchSize?: number;
}, newAgentPolicyId: string): Promise<{
    actionId: string;
}>;
