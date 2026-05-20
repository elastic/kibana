import type { ElasticsearchClient, SavedObjectsClientContract, Logger } from '@kbn/core/server';
import type { SavedObject } from '@kbn/core/server';
import type { AssetReference, EsAssetReference, KibanaAssetReference, Installation, InstallSource } from '../../../types';
import type { PackageSpecConditions } from '../../../../common';
/**
 * Removes package dependencies that were installed for the given package (listed in is_dependency_of)
 * and that have no other dependants after removing this package.
 */
export declare function cleanupDependenciesStep(options: {
    savedObjectsClient: SavedObjectsClientContract;
    pkgName: string;
    installation: Installation;
    esClient: ElasticsearchClient;
    force?: boolean;
    installSource?: InstallSource;
}): Promise<void>;
export declare function removeInstallation(options: {
    savedObjectsClient: SavedObjectsClientContract;
    pkgName: string;
    pkgVersion?: string;
    esClient: ElasticsearchClient;
    force?: boolean;
    installSource?: InstallSource;
}): Promise<AssetReference[]>;
/**
 * This method deletes saved objects resolving them whenever necessary.
 *
 * Resolving is needed when deleting assets that were installed in 7.x to
 * mitigate the breaking change that occurred in 8.0. This is a memory-intensive
 * operation as it requires loading all the saved objects into memory. It is
 * generally better to delete assets directly if the package is known to be
 * installed in 8.x or later.
 */
export declare function deleteKibanaAssets({ installedObjects, packageSpecConditions, logger, spaceId, }: {
    installedObjects: KibanaAssetReference[];
    logger: Logger;
    packageSpecConditions?: PackageSpecConditions;
    spaceId?: string;
}): Promise<void>;
export declare const deleteESAsset: (installedObject: EsAssetReference, esClient: ElasticsearchClient) => Promise<void>;
export declare const deleteESAssets: (installedObjects: EsAssetReference[], esClient: ElasticsearchClient) => Array<Promise<void>>;
export declare const splitESAssets: (installedEs: EsAssetReference[]) => {
    indexTemplatesAndPipelines: EsAssetReference[];
    indexAssets: EsAssetReference[];
    transformAssets: EsAssetReference[];
    otherAssets: EsAssetReference[];
};
/**
 * deletePrerequisiteAssets removes the ES assets that need to be deleted first and in a certain order.
 * All the other assets can be deleted after these (see deleteAssets)
 */
export declare function deletePrerequisiteAssets({ indexAssets, transformAssets, indexTemplatesAndPipelines, }: {
    indexAssets: EsAssetReference[];
    transformAssets: EsAssetReference[];
    indexTemplatesAndPipelines: EsAssetReference[];
}, esClient: ElasticsearchClient): Promise<void>;
export declare function deleteKibanaSavedObjectsAssets({ savedObjectsClient, installedPkg, spaceId, }: {
    savedObjectsClient: SavedObjectsClientContract;
    installedPkg: SavedObject<Installation>;
    spaceId?: string;
}): Promise<void>;
export declare function deleteILMPolicies(installedObjects: EsAssetReference[], esClient: ElasticsearchClient): Promise<void>;
export declare function deleteMLModels(installedObjects: EsAssetReference[], esClient: ElasticsearchClient): Promise<void>;
export declare function cleanupComponentTemplate(installedObjects: EsAssetReference[], esClient: ElasticsearchClient): Promise<void>;
export declare function cleanupTransforms(installedObjects: EsAssetReference[], esClient: ElasticsearchClient): Promise<void>;
export declare function cleanupEsqlViews(installedObjects: EsAssetReference[], esClient: ElasticsearchClient): Promise<void>;
/**
 * This function deletes assets for a given installation and updates the package SO accordingly.
 *
 * It is used to delete assets installed for input packages when they are no longer relevant,
 * e.g. when a package policy is deleted and the package has no more policies.
 */
export declare function cleanupAssets(datasetName: string, installationToDelete: Installation, originalInstallation: Installation, esClient: ElasticsearchClient, soClient: SavedObjectsClientContract): Promise<void>;
