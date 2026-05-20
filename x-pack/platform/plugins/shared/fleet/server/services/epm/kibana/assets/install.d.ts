import type { SavedObject, SavedObjectsBulkCreateObject, SavedObjectsClientContract, ISavedObjectsImporter, SavedObjectsImportSuccess, Logger } from '@kbn/core/server';
import { KibanaAssetType, KibanaSavedObjectType } from '../../../../types';
import type { Installation, PackageSpecTags } from '../../../../types';
import type { KibanaAssetReference, PackageInstallContext } from '../../../../../common/types';
type SavedObjectsImporterContract = Pick<ISavedObjectsImporter, 'import' | 'resolveImportErrors'>;
type SavedObjectToBe = Required<Pick<SavedObjectsBulkCreateObject, keyof ArchiveAsset | 'originId'>> & {
    type: KibanaSavedObjectType;
};
export type ArchiveAsset = Pick<SavedObject, 'id' | 'attributes' | 'migrationVersion' | 'references' | 'coreMigrationVersion' | 'typeMigrationVersion'> & {
    type: KibanaSavedObjectType;
};
export declare const KibanaSavedObjectTypeMapping: Record<KibanaAssetType, KibanaSavedObjectType>;
export declare function createSavedObjectKibanaAsset(asset: ArchiveAsset, options?: {
    installAsAdditionalSpace?: boolean;
    spaceId?: string;
}): SavedObjectToBe;
export declare function installKibanaAssets({ kibanaAssetsArchiveIterator, savedObjectsClient, savedObjectsImporter, logger, options, }: {
    savedObjectsClient: SavedObjectsClientContract;
    savedObjectsImporter: SavedObjectsImporterContract;
    logger: Logger;
    kibanaAssetsArchiveIterator: ReturnType<typeof getKibanaAssetsArchiveIterator>;
    options: {
        installAsAdditionalSpace?: boolean;
        spaceId?: string;
    };
}): Promise<SavedObjectsImportSuccess[]>;
export declare function installManagedIndexPattern({ savedObjectsClient, savedObjectsImporter, }: {
    savedObjectsClient: SavedObjectsClientContract;
    savedObjectsImporter: SavedObjectsImporterContract;
}): Promise<void>;
export declare function createDefaultIndexPatterns(savedObjectsImporter: SavedObjectsImporterContract): Promise<void>;
export declare function installKibanaAssetsAndReferencesMultispace({ savedObjectsClient, logger, pkgName, pkgTitle, packageInstallContext, installedPkg, spaceId, assetTags, installAsAdditionalSpace, }: {
    savedObjectsClient: SavedObjectsClientContract;
    logger: Logger;
    pkgName: string;
    pkgTitle: string;
    packageInstallContext: PackageInstallContext;
    installedPkg?: SavedObject<Installation>;
    spaceId: string;
    assetTags?: PackageSpecTags[];
    installAsAdditionalSpace?: boolean;
}): Promise<KibanaAssetReference[]>;
export declare function installKibanaAssetsAndReferences({ savedObjectsClient, logger, pkgName, pkgTitle, packageInstallContext, installedPkg, spaceId, assetTags, installAsAdditionalSpace, }: {
    savedObjectsClient: SavedObjectsClientContract;
    logger: Logger;
    pkgName: string;
    pkgTitle: string;
    packageInstallContext: PackageInstallContext;
    installedPkg?: SavedObject<Installation>;
    spaceId: string;
    assetTags?: PackageSpecTags[];
    installAsAdditionalSpace?: boolean;
}): Promise<KibanaAssetReference[]>;
export declare function deleteKibanaAssetsAndReferencesForSpace({ savedObjectsClient, logger, pkgName, installedPkg, spaceId, }: {
    savedObjectsClient: SavedObjectsClientContract;
    logger: Logger;
    pkgName: string;
    installedPkg: SavedObject<Installation>;
    spaceId: string;
}): Promise<void>;
export declare const isKibanaAssetType: (path: string) => boolean;
declare function getKibanaAssetsArchiveIterator(packageInstallContext: PackageInstallContext): (onEntry: (entry: {
    path: string;
    asset: ArchiveAsset;
    assetType: KibanaAssetType;
}) => Promise<void>) => Promise<void>;
export declare function installKibanaSavedObjects({ savedObjectsImporter, kibanaAssets, assetsChunkSize, logger, options, }: {
    kibanaAssets: ArchiveAsset[];
    savedObjectsImporter: SavedObjectsImporterContract;
    logger: Logger;
    assetsChunkSize?: number;
    options?: {
        installAsAdditionalSpace?: boolean;
        spaceId?: string;
    };
}): Promise<SavedObjectsImportSuccess[]>;
export declare function toAssetReference({ id, type }: SavedObject): KibanaAssetReference;
/**
 * Exported only for testing
 */
export declare function replaceIdsInKibanaAsset(kibanaAsset: SavedObjectToBe, idReplacements: Record<string, string>): {
    updated: boolean;
    updatedAsset: SavedObjectToBe;
};
export {};
