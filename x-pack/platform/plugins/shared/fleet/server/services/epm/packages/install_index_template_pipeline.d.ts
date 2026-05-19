import type { ElasticsearchClient, SavedObjectsClientContract, Logger } from '@kbn/core/server';
import type { PackageInstallContext } from '../../../../common/types';
import type { EsAssetReference, Installation, RegistryDataStream } from '../../../types';
export declare function installIndexTemplatesAndPipelines({ installedPkg, packageInstallContext, esReferences, savedObjectsClient, esClient, logger, onlyForDataStreams, }: {
    installedPkg?: Installation;
    packageInstallContext: PackageInstallContext;
    esReferences: EsAssetReference[];
    savedObjectsClient: SavedObjectsClientContract;
    esClient: ElasticsearchClient;
    logger: Logger;
    onlyForDataStreams?: RegistryDataStream[];
}): Promise<{
    esReferences: EsAssetReference[];
    installedTemplates: import("../../../types").IndexTemplateEntry[];
}>;
