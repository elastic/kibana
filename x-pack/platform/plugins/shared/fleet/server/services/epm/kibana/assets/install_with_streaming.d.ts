import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { PackageInstallContext } from '../../../../../common/types';
import { type KibanaAssetReference, type PackageSpecTags } from '../../../../types';
interface InstallKibanaAssetsWithStreamingArgs {
    pkgName: string;
    packageInstallContext: PackageInstallContext;
    spaceId: string;
    assetTags?: PackageSpecTags[];
    savedObjectsClient: SavedObjectsClientContract;
}
export declare function installKibanaAssetsWithStreaming({ spaceId, packageInstallContext, savedObjectsClient, pkgName, }: InstallKibanaAssetsWithStreamingArgs): Promise<KibanaAssetReference[]>;
export {};
