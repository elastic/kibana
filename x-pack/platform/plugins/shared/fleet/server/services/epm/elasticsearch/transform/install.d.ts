import type { ElasticsearchClient, Logger, SavedObjectsClientContract, KibanaRequest } from '@kbn/core/server';
import { type PackageInstallContext } from '../../../../../common/types/models';
import type { EsAssetReference } from '../../../../../common/types/models';
interface InstallTransformsParams {
    packageInstallContext: PackageInstallContext;
    esClient: ElasticsearchClient;
    savedObjectsClient: SavedObjectsClientContract;
    logger: Logger;
    esReferences?: EsAssetReference[];
    /**
     * Force transforms to install again even though fleet_transform_version might be same
     * Should be true when package is re-installing
     */
    force?: boolean;
    /**
     * Original Kibana request, used to generate API key from user
     * to pass in secondary authorization info to transform
     */
    request?: KibanaRequest;
}
export declare const installTransforms: ({ packageInstallContext, esClient, savedObjectsClient, logger, force, esReferences, request, }: InstallTransformsParams) => Promise<{
    installedTransforms: EsAssetReference[];
    esReferences: EsAssetReference[];
}>;
export declare const isTransform: (path: string) => boolean;
export {};
