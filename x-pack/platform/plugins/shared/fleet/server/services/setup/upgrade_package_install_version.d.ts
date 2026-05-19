import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
/**
 * Upgrade package install version for packages installed with an older version of Kibana
 */
export declare function upgradePackageInstallVersion({ soClient, esClient, logger, }: {
    soClient: SavedObjectsClientContract;
    esClient: ElasticsearchClient;
    logger: Logger;
}): Promise<void>;
