import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
/**
 * Given a list of Agent Policy IDs, an array will be returned with
 * the ids of the agents using that agent policy.
 * @param esClient
 * @param agentPolicyIds
 */
export declare const getAgentIdsForAgentPolicies: (esClient: ElasticsearchClient, agentPolicyIds: string[]) => Promise<string[]>;
