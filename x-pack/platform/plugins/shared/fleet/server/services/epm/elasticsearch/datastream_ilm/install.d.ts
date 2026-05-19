import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { type PackageInstallContext } from '../../../../../common/types/models';
import type { EsAssetReference } from '../../../../../common/types/models';
export declare const installIlmForDataStream: (packageInstallContext: PackageInstallContext, esClient: ElasticsearchClient, savedObjectsClient: SavedObjectsClientContract, logger: Logger, esReferences: EsAssetReference[]) => Promise<{
    installedIlms: EsAssetReference[];
    esReferences: EsAssetReference[];
}>;
