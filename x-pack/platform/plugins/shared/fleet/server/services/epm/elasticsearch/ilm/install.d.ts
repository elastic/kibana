import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { EsAssetReference } from '../../../../types';
import type { PackageInstallContext } from '../../../../../common/types';
export declare function installILMPolicy(packageInstallContext: PackageInstallContext, esClient: ElasticsearchClient, savedObjectsClient: SavedObjectsClientContract, logger: Logger, esReferences: EsAssetReference[]): Promise<EsAssetReference[]>;
