import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { AgentRequestInvalidError } from '../../../common/errors';
import type { GetAgentsOptions } from './crud';
export declare class CollectorRemovalError extends AgentRequestInvalidError {
}
export declare function removeCollector(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, agentId: string): Promise<void>;
export declare function removeCollectors(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, options: GetAgentsOptions & {
    showInactive?: boolean;
}): Promise<{
    actionId: string;
}>;
