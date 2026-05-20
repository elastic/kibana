import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { Agent, AgentAction, NewAgentAction, FleetServerAgentAction } from '../../../common/types/models';
export declare const NO_EXPIRATION = "NONE";
/**
 * Indexes a new action to the .fleet-actions index.
 * Takes any secret data stored within the secrets field, stores it in saved objects,
 * and replaces them in the action data with a reference to the saved objects.
 */
export declare function createAgentAction(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, newAgentAction: NewAgentAction): Promise<AgentAction>;
/**
 * Recursively transforms all occurrences of { id: string } objects
 * into `$co.elastic.secret{${id}}`, for any level of nesting.
 */
export declare function transformDataSecrets<T>(mergedData: T): any;
export declare function bulkCreateAgentActions(esClient: ElasticsearchClient, newAgentActions: NewAgentAction[]): Promise<AgentAction[]>;
export declare function createErrorActionResults(esClient: ElasticsearchClient, actionId: string, errors: Record<Agent['id'], Error>, errorMessage: string): Promise<void>;
export declare function bulkCreateAgentActionResults(esClient: ElasticsearchClient, results: Array<{
    actionId: string;
    agentId: string;
    namespaces?: string[];
    error?: string;
}>): Promise<void>;
export declare function getAgentActions(esClient: ElasticsearchClient, actionId: string): Promise<FleetServerAgentAction[]>;
export declare function getUnenrollAgentActions(esClient: ElasticsearchClient): Promise<FleetServerAgentAction[]>;
export declare function cancelAgentAction(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, actionId: string): Promise<AgentAction>;
export declare const getAgentsByActionsIds: (esClient: ElasticsearchClient, actionsIds: string[]) => Promise<string[]>;
export interface ActionsService {
    getAgent: (esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, agentId: string) => Promise<Agent>;
    cancelAgentAction: (esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, actionId: string) => Promise<AgentAction>;
    createAgentAction: (esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, newAgentAction: Omit<AgentAction, 'id'>) => Promise<AgentAction>;
    getAgentActions: (esClient: ElasticsearchClient, actionId: string) => Promise<any[]>;
}
