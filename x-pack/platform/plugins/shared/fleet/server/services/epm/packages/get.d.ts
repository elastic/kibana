import type { ElasticsearchClient, SavedObjectsClientContract, SavedObjectsFindOptions } from '@kbn/core/server';
import type { Logger } from '@kbn/core/server';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { PackageUsageStats, Installable, PackageDataStreamTypes, InstalledPackage, PackageSpecManifest, AssetsMap, PackagePolicyAssetsMap, PackageKnowledgeBase } from '../../../../common/types';
import type { ArchivePackage, RegistryPackage, GetCategoriesRequest, GetPackagesRequest } from '../../../../common/types';
import type { Installation, PackageInfo } from '../../../types';
export { getFile } from '../registry';
export declare function getCategories(options: GetCategoriesRequest['query']): Promise<import("../../../types").CategorySummaryList>;
export declare function getPackages(options: {
    savedObjectsClient: SavedObjectsClientContract;
    excludeInstallStatus?: boolean;
} & GetPackagesRequest['query']): Promise<Installable<import("../../../types").RegistrySearchResult & {
    title: string;
} & {
    id: string;
}>[]>;
interface GetInstalledPackagesOptions {
    savedObjectsClient: SavedObjectsClientContract;
    esClient: ElasticsearchClient;
    dataStreamType?: PackageDataStreamTypes;
    nameQuery?: string;
    searchAfter?: SortResults;
    perPage: number;
    sortOrder: 'asc' | 'desc';
    showOnlyActiveDataStreams?: boolean;
    dependencyPackageName?: string;
}
export declare function getInstalledPackages(options: GetInstalledPackagesOptions): Promise<{
    items: {
        title: string | undefined;
        description: string | undefined;
        icons: import("../../../../common/types").PackageSpecIcon[] | undefined;
        name: string;
        version: string;
        status: import("../../../types").EpmPackageInstallStatus;
        dataStreams: {
            name: string;
            title: string;
        }[];
    }[];
    total: number;
    searchAfter: SortResults | undefined;
}>;
export declare function getLimitedPackages(options: {
    savedObjectsClient: SavedObjectsClientContract;
    prerelease?: boolean;
}): Promise<string[]>;
export declare function getPackageSavedObjects(savedObjectsClient: SavedObjectsClientContract, options?: Omit<SavedObjectsFindOptions, 'type'>): Promise<import("@kbn/core/server").SavedObjectsFindResponse<Installation, unknown>>;
export declare function getInstalledPackageSavedObjects(savedObjectsClient: SavedObjectsClientContract, options: Omit<GetInstalledPackagesOptions, 'savedObjectsClient' | 'esClient'>): Promise<import("@kbn/core/server").SavedObjectsFindResponse<Installation, unknown>>;
export declare function getInstalledPackageManifests(savedObjectsClient: SavedObjectsClientContract, installedPackages: InstalledPackage[]): Promise<Map<string, PackageSpecManifest>>;
export declare const getInstallations: typeof getPackageSavedObjects;
export declare function getPackageInfo({ savedObjectsClient, pkgName, pkgVersion, skipArchive, ignoreUnverified, prerelease, }: {
    savedObjectsClient: SavedObjectsClientContract;
    pkgName: string;
    pkgVersion: string;
    /** Avoid loading the registry archive into the cache (only use for performance reasons). Defaults to `false` */
    skipArchive?: boolean;
    ignoreUnverified?: boolean;
    prerelease?: boolean;
}): Promise<PackageInfo>;
export declare const getPackageUsageStats: ({ savedObjectsClient, pkgName, }: {
    savedObjectsClient: SavedObjectsClientContract;
    pkgName: string;
}) => Promise<PackageUsageStats>;
export declare function getPackageDependencies(pkgName: string, pkgVersion: string): Promise<Array<{
    name: string;
    version: string;
    title: string;
}>>;
interface PackageResponse {
    paths: string[];
    packageInfo: ArchivePackage | RegistryPackage;
}
export declare function getPackageFromSource(options: {
    pkgName: string;
    pkgVersion: string;
    installedPkg?: Installation;
    savedObjectsClient: SavedObjectsClientContract;
    ignoreUnverified?: boolean;
}): Promise<PackageResponse>;
export declare function getInstallationObject(options: {
    savedObjectsClient: SavedObjectsClientContract;
    pkgName: string;
    logger?: Logger;
}): Promise<import("@kbn/core/server").SavedObject<Installation> | undefined>;
export declare function getInstallation(options: {
    savedObjectsClient: SavedObjectsClientContract;
    pkgName: string;
    logger?: Logger;
}): Promise<Installation | undefined>;
/**
 * Return an installed package with his related assets
 */
export declare function getInstalledPackageWithAssets(options: {
    savedObjectsClient: SavedObjectsClientContract;
    pkgName: string;
    logger?: Logger;
    ignoreUnverified?: boolean;
    assetsFilter?: (path: string) => boolean;
}): Promise<{
    installation: Installation;
    assetsMap: Map<string, Buffer<ArrayBufferLike> | undefined>;
    packageInfo: ArchivePackage;
    paths: string[];
} | undefined>;
export declare function getInstallationsByName(options: {
    savedObjectsClient: SavedObjectsClientContract;
    pkgNames: string[];
}): Promise<Installation[]>;
/**
 * Return assets for an installed package from ES or from the registry otherwise
 */
export declare function getPackageAssetsMap({ savedObjectsClient, packageInfo, logger, ignoreUnverified, }: {
    savedObjectsClient: SavedObjectsClientContract;
    packageInfo: PackageInfo;
    logger: Logger;
    ignoreUnverified?: boolean;
}): Promise<AssetsMap>;
/**
 * Return assets agent template assets map for package policies operation
 */
export declare function getAgentTemplateAssetsMap({ savedObjectsClient, packageInfo, logger, ignoreUnverified, }: {
    savedObjectsClient: SavedObjectsClientContract;
    packageInfo: PackageInfo;
    logger: Logger;
    ignoreUnverified?: boolean;
}): Promise<PackagePolicyAssetsMap>;
/**
 * Get knowledge base content for a package
 * @param options Object with esClient and package name
 * @returns The knowledge base content or undefined if not found
 */
export declare function getPackageKnowledgeBase(options: {
    esClient: ElasticsearchClient;
    pkgName: string;
    abortController?: AbortController;
}): Promise<PackageKnowledgeBase | undefined>;
