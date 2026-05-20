import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { AgentStatus } from '../../types';
export declare function getAgentStatusById(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, agentId: string): Promise<AgentStatus>;
/**
 * getAgentStatusForAgentPolicy
 * @param esClient
 * @param soClient
 * @param agentPolicyId @deprecated use agentPolicyIds instead since the move to multi-policy
 * @param filterKuery
 * @param spaceId
 * @param agentPolicyIds
 */
export declare function getAgentStatusForAgentPolicy(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, agentPolicyId?: string, filterKuery?: string, spaceId?: string, agentPolicyIds?: string[]): Promise<{
    all: number;
    active: number;
    other: number;
    events: number;
    total: number;
    offline: number;
    inactive: number;
    uninstalled: number;
    updating: number;
    unenrolled: number;
    orphaned: number;
    online: number;
    error: number;
}>;
export declare function getIncomingDataByAgentsId({ esClient, agentsIds, dataStreamPattern, returnDataPreview, }: {
    esClient: ElasticsearchClient;
    agentsIds: string[];
    dataStreamPattern?: string;
    returnDataPreview?: boolean;
}): Promise<{
    items: {
        [x: string]: {
            data: boolean;
        };
    }[];
    dataPreview: import("@elastic/elasticsearch/lib/api/types").SearchHit<unknown>[];
}>;
