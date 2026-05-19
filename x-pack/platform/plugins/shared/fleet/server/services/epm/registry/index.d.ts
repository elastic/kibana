import type { Response } from 'node-fetch';
import type { Logger } from '@kbn/logging';
import type { ExtractedIntegrationFields } from '@kbn/fields-metadata-plugin/server';
import { splitPkgKey as split } from '../../../../common/services';
import type { AssetsGroupedByServiceByType, CategorySummaryList, RegistryPackage, RegistrySearchResults, GetCategoriesRequest, GetPackagesRequest, PackageVerificationResult, ArchivePackage, BundledPackage, AssetsMap } from '../../../types';
import type { ArchiveIterator } from '../../../../common/types';
export declare const splitPkgKey: typeof split;
export declare const pkgToPkgKey: ({ name, version }: {
    name: string;
    version: string;
}) => string;
export declare function fetchList(params?: GetPackagesRequest['query']): Promise<RegistrySearchResults>;
export interface FetchFindLatestPackageOptions {
    ignoreConstraints?: boolean;
    prerelease?: boolean;
}
export declare function fetchFindLatestPackageOrThrow(packageName: string, options?: FetchFindLatestPackageOptions): Promise<RegistryPackage | BundledPackage>;
export declare function fetchFindLatestPackageOrUndefined(packageName: string, options?: FetchFindLatestPackageOptions): Promise<RegistryPackage | BundledPackage | undefined>;
export declare function fetchInfo(pkgName: string, pkgVersion: string): Promise<RegistryPackage | ArchivePackage>;
export declare function getBundledArchive(pkgName: string, pkgVersion: string): Promise<{
    paths: string[];
    packageInfo: ArchivePackage;
} | undefined>;
export declare function getFile(pkgName: string, pkgVersion: string, relPath: string): Promise<Response | null>;
export declare function fetchFile(filePath: string): Promise<Response | null>;
export declare function fetchCategories(params?: GetCategoriesRequest['query']): Promise<CategorySummaryList>;
export declare function getInfo(name: string, version: string): Promise<RegistryPackage>;
export declare function getPackage(name: string, version: string, options?: {
    ignoreUnverified?: boolean;
    useStreaming?: boolean;
}): Promise<{
    paths: string[];
    packageInfo: ArchivePackage;
    assetsMap: AssetsMap;
    archiveIterator: ArchiveIterator;
    verificationResult?: PackageVerificationResult;
}>;
export declare function getPackageFieldsMetadata(params: {
    packageName: string;
    datasetName?: string;
}, options?: {
    excludedFieldsAssets?: string[];
}): Promise<ExtractedIntegrationFields>;
export declare function ensureContentType(archivePath: string): string;
export declare function fetchArchiveBuffer({ pkgName, pkgVersion, shouldVerify, ignoreUnverified, }: {
    pkgName: string;
    pkgVersion: string;
    shouldVerify: boolean;
    ignoreUnverified?: boolean;
}): Promise<{
    archiveBuffer: Buffer;
    archivePath: string;
    verificationResult?: PackageVerificationResult;
}>;
export declare function getPackageArchiveSignatureOrUndefined({ pkgName, pkgVersion, logger, }: {
    pkgName: string;
    pkgVersion: string;
    logger: Logger;
}): Promise<string | undefined>;
export declare function groupPathsByService(paths: string[]): AssetsGroupedByServiceByType;
export declare function getNoticePath(paths: string[]): string | undefined;
export declare function getLicensePath(paths: string[]): string | undefined;
