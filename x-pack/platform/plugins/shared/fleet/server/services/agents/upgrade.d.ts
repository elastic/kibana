import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { Agent } from '../../types';
import type { GetAgentsOptions } from './crud';
export declare function sendUpgradeAgentAction({ soClient, esClient, agentId, version, sourceUri, }: {
    soClient: SavedObjectsClientContract;
    esClient: ElasticsearchClient;
    agentId: string;
    version: string;
    sourceUri: string | undefined;
}): Promise<void>;
export declare function sendUpgradeAgentsActions(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, options: ({
    agents: Agent[];
} | GetAgentsOptions) & {
    version: string;
    sourceUri?: string | undefined;
    force?: boolean;
    skipRateLimitCheck?: boolean;
    upgradeDurationSeconds?: number;
    startTime?: string;
    batchSize?: number;
    isAutomatic?: boolean;
}): Promise<{
    actionId: string;
}>;
export declare function sendAutomaticUpgradeAgentsActions(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, options: {
    agents: Agent[];
    version: string;
    upgradeDurationSeconds?: number;
    spaceIds?: string[];
    force?: boolean;
}): Promise<{
    actionId: string;
}>;
