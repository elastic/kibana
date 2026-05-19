import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { Agent } from '../../types';
import type { GetAgentsOptions } from '.';
export declare function updateAgentTags(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, options: ({
    agents: Agent[];
} | GetAgentsOptions) & {
    batchSize?: number;
}, tagsToAdd: string[], tagsToRemove: string[]): Promise<{
    actionId: string;
}>;
