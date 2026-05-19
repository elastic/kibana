import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { Agent } from '../../types';
import { type GetAgentsOptions } from './crud';
export declare const NO_ROLLBACK_ERROR_MESSAGE = "upgrade rollback not available for agent";
export declare const EXPIRED_ROLLBACK_ERROR_MESSAGE = "upgrade rollback window has expired";
export declare function getValidRollbacks(agent: Agent): import("../../../common/types").AgentRollback[];
export declare function sendRollbackAgentAction(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, agent: Agent): Promise<string>;
export declare function sendRollbackAgentsActions(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, options: ({
    agents: Agent[];
} | GetAgentsOptions) & {
    batchSize?: number;
    includeInactive?: boolean;
}): Promise<{
    actionIds: string[];
}>;
