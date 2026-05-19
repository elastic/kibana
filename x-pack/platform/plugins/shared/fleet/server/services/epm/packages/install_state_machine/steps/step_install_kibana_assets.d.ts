import type { InstallContext } from '../_state_machine_package_install';
import type { KibanaAssetReference } from '../../../../../../common/types';
export declare function stepInstallKibanaAssets(context: InstallContext): Promise<{
    kibanaAssetPromise: Promise<KibanaAssetReference[]>;
}>;
export declare function stepInstallKibanaAssetsWithStreaming(context: InstallContext): Promise<{
    installedKibanaAssetsRefs: KibanaAssetReference[];
}>;
export declare function cleanUpKibanaAssetsStep(context: InstallContext): Promise<void>;
/**
 * Cleans up Kibana assets that are no longer in the package. As opposite to
 * `cleanUpKibanaAssetsStep`, this one is used after the package assets are
 * installed.
 *
 * This function compares the currently installed Kibana assets with the assets
 * in the previous package and removes any assets that are no longer present in the
 * new installation.
 *
 */
export declare function cleanUpUnusedKibanaAssetsStep(context: InstallContext): Promise<void>;
