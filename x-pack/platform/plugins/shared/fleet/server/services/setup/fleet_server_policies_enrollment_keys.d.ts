import type { ElasticsearchClient, SavedObjectsClientContract, Logger } from '@kbn/core/server';
export declare function ensureAgentPoliciesFleetServerKeysAndPolicies({ logger, soClient, esClient, }: {
    logger: Logger;
    soClient: SavedObjectsClientContract;
    esClient: ElasticsearchClient;
}): Promise<void>;
