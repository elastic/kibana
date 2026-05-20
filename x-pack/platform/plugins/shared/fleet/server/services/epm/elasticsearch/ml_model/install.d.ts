import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { type PackageInstallContext } from '../../../../../common/types/models';
import type { EsAssetReference } from '../../../../../common/types/models';
export declare const installMlModel: (packageInstallContext: PackageInstallContext, esClient: ElasticsearchClient, savedObjectsClient: SavedObjectsClientContract, logger: Logger, esReferences: EsAssetReference[]) => Promise<EsAssetReference[]>;
