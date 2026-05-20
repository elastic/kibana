import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
/**
 * Given a list of Agent Policy IDs (parent policy ids), returns the count of active agents
 * assigned to each policy or any of its version-specific policies (e.g. policy1 and policy1#9.3).
 * @param esClient
 * @param agentPolicyIds parent agent policy ids
 */
export declare const getAgentCountForAgentPolicies: (esClient: ElasticsearchClient, agentPolicyIds: string[]) => Promise<Record<string, number>>;
