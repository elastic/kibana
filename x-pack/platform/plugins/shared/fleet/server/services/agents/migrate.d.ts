import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { AgentPolicy, Agent } from '../../types';
import type { GetAgentsOptions } from './crud';
export declare function migrateSingleAgent(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, agentId: string, agentPolicy: AgentPolicy | undefined, agent: Agent, options: {
    policyId?: string;
    enrollment_token: string;
    uri: string;
    settings?: Record<string, any>;
}): Promise<{
    actionId: string;
}>;
export declare function bulkMigrateAgents(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, options: GetAgentsOptions & {
    batchSize?: number;
    enrollment_token: string;
    uri: string;
    settings?: Record<string, any>;
}): Promise<{
    actionId: string;
}>;
