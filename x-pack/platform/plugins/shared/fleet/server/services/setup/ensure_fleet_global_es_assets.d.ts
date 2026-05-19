import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
/**
 * Ensure ES assets shared by all Fleet index template are installed
 */
export declare function ensureFleetGlobalEsAssets({ logger, soClient, esClient, }: {
    logger: Logger;
    soClient: SavedObjectsClientContract;
    esClient: ElasticsearchClient;
}, options: {
    reinstallPackages?: boolean;
}): Promise<void>;
