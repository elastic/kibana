import type { estypes } from '@elastic/elasticsearch';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';
import type { KueryNode } from '@kbn/es-query';
import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { AgentSOAttributes, Agent, ListWithKuery } from '../../types';
import type { AgentStatus } from '../../../common/types';
export declare function _joinFilters(filters: Array<string | undefined | KueryNode>): KueryNode | undefined;
export declare function removeSOAttributes(kuery: string): string;
export type GetAgentsOptions = {
    agentIds: string[];
} | {
    kuery: string;
    showAgentless?: boolean;
    showInactive?: boolean;
    perPage?: number;
};
export declare function getAgents(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, options: GetAgentsOptions): Promise<Agent[]>;
export declare function openPointInTime(esClient: ElasticsearchClient, keepAlive?: string, index?: string): Promise<string>;
export declare function closePointInTime(esClient: ElasticsearchClient, pitId: string): Promise<void>;
export declare function getAgentTags(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, options: ListWithKuery & {
    showInactive: boolean;
}): Promise<string[]>;
export declare function getAgentsByKuery(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, options: ListWithKuery & {
    showAgentless?: boolean;
    showInactive: boolean;
    spaceId?: string;
    getStatusSummary?: boolean;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
    searchAfter?: SortResults;
    openPit?: boolean;
    pitId?: string;
    pitKeepAlive?: string;
    aggregations?: Record<string, AggregationsAggregationContainer>;
}): Promise<{
    agents: Agent[];
    total: number;
    page: number;
    perPage: number;
    pit?: string;
    statusSummary?: Record<AgentStatus, number>;
    aggregations?: Record<string, estypes.AggregationsAggregate>;
}>;
export declare function getAllAgentsByKuery(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, options: Omit<ListWithKuery, 'page' | 'perPage'> & {
    showAgentless?: boolean;
    showInactive: boolean;
}): Promise<{
    agents: Agent[];
    total: number;
}>;
/**
 * Fetch all agents by kuery in batches.
 * @param esClient
 * @param soClient
 * @param options
 */
export declare function fetchAllAgentsByKuery(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, options: ListWithKuery & {
    spaceId?: string;
    runtimeFields?: estypes.SearchRequest['runtime_mappings'];
    showInactive?: boolean;
}): Promise<AsyncIterable<Agent[]>>;
export declare function getAgentById(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, agentId: string): Promise<Agent>;
/**
 * Get list of agents by `id`. service method performs space awareness checks.
 * @param esClient
 * @param soClient
 * @param agentIds
 * @param options
 *
 * @throws AgentNotFoundError
 */
export declare const getByIds: (esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, agentIds: string[], options?: Partial<{
    ignoreMissing: boolean;
}>) => Promise<Agent[]>;
export declare function getAgentsById(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, agentIds: string[]): Promise<Array<Agent | {
    id: string;
    notFound: true;
}>>;
export declare function getAgentVersionsForAgentPolicyIds(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, agentPolicyIds: string[]): Promise<Array<{
    policyId: string;
    versionCounts: Record<string, number>;
}>>;
export declare function getAgentByAccessAPIKeyId(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, accessAPIKeyId: string): Promise<Agent>;
export declare function updateAgent(esClient: ElasticsearchClient, agentId: string, data: Partial<AgentSOAttributes>): Promise<void>;
export declare function bulkUpdateAgents(esClient: ElasticsearchClient, updateData: Array<{
    agentId: string;
    data: Partial<AgentSOAttributes>;
}>, errors: {
    [key: string]: Error;
}): Promise<void>;
export declare function deleteAgent(esClient: ElasticsearchClient, agentId: string): Promise<void>;
export declare function getAgentPolicyForAgent(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, agentId: string): Promise<import("../../types").AgentPolicy | undefined>;
export declare function getAgentPolicyForAgents(soClient: SavedObjectsClientContract, agents: Agent[]): Promise<import("../../types").AgentPolicy[]>;
export declare function getSpaceAwarenessFilterForAgents(spaceId: string | undefined): Promise<string[]>;
