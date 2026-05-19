import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { EsAssetReference, PackageInstallContext } from '../../../../../common/types';
export declare function installEsqlViews({ packageInstallContext, esClient, savedObjectsClient, logger, esReferences, }: {
    packageInstallContext: PackageInstallContext;
    esClient: ElasticsearchClient;
    savedObjectsClient: SavedObjectsClientContract;
    logger: Logger;
    esReferences: EsAssetReference[];
}): Promise<EsAssetReference[]>;
