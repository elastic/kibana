import type { SavedObjectsClientContract, SavedObjectsBulkCreateObject } from '@kbn/core/server';
import type { ArchiveEntry, InstallablePackage, InstallSource, PackageAssetReference } from '../../../../common/types';
export interface PackageAsset {
    package_name: string;
    package_version: string;
    install_source: string;
    asset_path: string;
    media_type: string;
    data_utf8: string;
    data_base64: string;
}
export declare function assetPathToObjectId(assetPath: string): string;
export declare function archiveEntryToESDocument(opts: {
    path: string;
    buffer: Buffer;
    name: string;
    version: string;
    installSource: InstallSource;
}): Promise<PackageAsset>;
export declare function removeArchiveEntries(opts: {
    savedObjectsClient: SavedObjectsClientContract;
    refs?: PackageAssetReference[];
}): Promise<import("@kbn/core/server").SavedObjectsBulkDeleteResponse | undefined>;
export declare function saveArchiveEntriesFromAssetsMap(opts: {
    savedObjectsClient: SavedObjectsClientContract;
    paths: string[];
    assetsMap: Map<string, Buffer | undefined>;
    packageInfo: InstallablePackage;
    installSource: InstallSource;
}): Promise<import("@kbn/core/server").SavedObjectsBulkResponse<PackageAsset>>;
export declare function archiveEntryToBulkCreateObject(opts: {
    path: string;
    buffer: Buffer;
    name: string;
    version: string;
    installSource: InstallSource;
}): Promise<SavedObjectsBulkCreateObject<PackageAsset>>;
export declare function packageAssetToArchiveEntry(asset: PackageAsset): ArchiveEntry;
export declare function getAsset(opts: {
    savedObjectsClient: SavedObjectsClientContract;
    path: string;
}): Promise<PackageAsset | undefined>;
export declare const getEsPackage: (pkgName: string, pkgVersion: string, references: PackageAssetReference[], savedObjectsClient: SavedObjectsClientContract, options?: {
    shouldFetchBuffer?: (reference: PackageAssetReference) => boolean;
}) => Promise<{
    packageInfo: import("../../../../common").ArchivePackage;
    paths: string[];
    assetsMap: Map<string, Buffer<ArrayBufferLike> | undefined>;
} | undefined>;
