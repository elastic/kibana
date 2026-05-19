import type { ElasticsearchClient, KibanaRequest, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import type { PackageList } from '../../../common';
import type { ArchivePackage, BundledPackage, CategoryId, EsAssetReference, GetInstalledPackagesRequestSchema, InstallablePackage, Installation, RegistryPackage } from '../../types';
import type { FleetAuthzRouteConfig } from '../security/types';
import type { InstallResult } from '../../../common';
import type { GetInstalledPackagesResponse, RollbackPackageResponse } from '../../../common/types';
import type { TemplateAgentPolicyInput } from '../../../common/types/models/agent_policy';
import { type CustomPackageDatasetConfiguration, type EnsurePackageResult } from './packages/install';
import type { FetchFindLatestPackageOptions } from './registry';
import { getPackageFieldsMetadata } from './registry';
import { getPackage } from './registry';
import { getPackageInfo } from './packages';
import type { PackageAsset } from './archive/storage';
export type InstalledAssetType = EsAssetReference;
export interface PackageService {
    asScoped(request: KibanaRequest): PackageClient;
    asInternalUser: PackageClient;
}
export interface PackageClient {
    getInstallation(pkgName: string, savedObjectsClient?: SavedObjectsClientContract): Promise<Installation | undefined>;
    ensureInstalledPackage(options: {
        pkgName: string;
        pkgVersion?: string;
        spaceId?: string;
        force?: boolean;
    }): Promise<EnsurePackageResult>;
    installPackage(options: {
        pkgName: string;
        pkgVersion?: string;
        spaceId?: string;
        force?: boolean;
        keepFailedInstallation?: boolean;
        useStreaming?: boolean;
        automaticInstall?: boolean;
    }): Promise<InstallResult>;
    installCustomIntegration(options: {
        pkgName: string;
        kibanaVersion?: string;
        force?: boolean;
        spaceId?: string;
        datasets: CustomPackageDatasetConfiguration[];
    }): Promise<InstallResult>;
    fetchFindLatestPackage(packageName: string, options?: FetchFindLatestPackageOptions): Promise<RegistryPackage | BundledPackage>;
    readBundledPackage(bundledPackage: BundledPackage): Promise<{
        packageInfo: ArchivePackage;
        paths: string[];
    }>;
    getPackage(packageName: string, packageVersion: string, options?: Parameters<typeof getPackage>['2']): ReturnType<typeof getPackage>;
    getPackageFieldsMetadata(params: Parameters<typeof getPackageFieldsMetadata>['0'], options?: Parameters<typeof getPackageFieldsMetadata>['1']): ReturnType<typeof getPackageFieldsMetadata>;
    getLatestPackageInfo(packageName: string, prerelease?: boolean): ReturnType<typeof getPackageInfo>;
    getPackages(params?: {
        excludeInstallStatus?: boolean;
        category?: CategoryId;
        prerelease?: boolean;
    }): Promise<PackageList>;
    getAgentPolicyConfigYAML(pkgName: string, pkgVersion?: string, isInputIncluded?: (input: TemplateAgentPolicyInput) => boolean, prerelease?: boolean, ignoreUnverified?: boolean, injectWiredStreamsRouting?: boolean): Promise<string>;
    reinstallEsAssets(packageInfo: InstallablePackage, assetPaths: string[]): Promise<InstalledAssetType[]>;
    getInstalledPackages(params: TypeOf<typeof GetInstalledPackagesRequestSchema.query>): Promise<GetInstalledPackagesResponse>;
    rollbackPackage(options: {
        pkgName: string;
    }): Promise<RollbackPackageResponse>;
    getPackageAsset(assetPath: string, savedObjectsClient?: SavedObjectsClientContract): Promise<PackageAsset | undefined>;
}
export declare class PackageServiceImpl implements PackageService {
    private readonly internalEsClient;
    private readonly internalSoClient;
    private readonly logger;
    constructor(internalEsClient: ElasticsearchClient, internalSoClient: SavedObjectsClientContract, logger: Logger);
    asScoped(request: KibanaRequest): PackageClientImpl;
    get asInternalUser(): PackageClientImpl;
}
declare class PackageClientImpl implements PackageClient {
    #private;
    private readonly internalEsClient;
    private readonly internalSoClient;
    private readonly logger;
    private readonly preflightCheck?;
    private readonly request?;
    constructor(internalEsClient: ElasticsearchClient, internalSoClient: SavedObjectsClientContract, logger: Logger, preflightCheck?: ((requiredAuthz?: FleetAuthzRouteConfig["fleetAuthz"]) => void | Promise<void>) | undefined, request?: KibanaRequest | undefined);
    getInstallation(pkgName: string, savedObjectsClient?: SavedObjectsClientContract): Promise<Installation | undefined>;
    ensureInstalledPackage(options: {
        pkgName: string;
        pkgVersion?: string;
        spaceId?: string;
        force?: boolean;
    }): Promise<EnsurePackageResult>;
    installPackage(options: {
        pkgName: string;
        pkgVersion?: string;
        spaceId?: string;
        force?: boolean;
        keepFailedInstallation?: boolean;
        useStreaming?: boolean;
        automaticInstall?: boolean;
    }): Promise<InstallResult>;
    installCustomIntegration(options: {
        pkgName: string;
        kibanaVersion?: string;
        force?: boolean | undefined;
        spaceId?: string | undefined;
        datasets: CustomPackageDatasetConfiguration[];
    }): Promise<InstallResult>;
    fetchFindLatestPackage(packageName: string, options?: FetchFindLatestPackageOptions): Promise<RegistryPackage | BundledPackage>;
    readBundledPackage(bundledPackage: BundledPackage): Promise<{
        paths: string[];
        packageInfo: ArchivePackage;
    }>;
    getAgentPolicyConfigYAML(pkgName: string, pkgVersion?: string, isInputIncluded?: (input: TemplateAgentPolicyInput) => boolean, prerelease?: boolean, ignoreUnverified?: boolean, injectWiredStreamsRouting?: boolean): Promise<string>;
    getPackage(packageName: string, packageVersion: string, options?: Parameters<typeof getPackage>['2']): Promise<{
        paths: string[];
        packageInfo: ArchivePackage;
        assetsMap: import("../../types").AssetsMap;
        archiveIterator: import("../../../common/types").ArchiveIterator;
        verificationResult?: import("../../types").PackageVerificationResult;
    }>;
    getPackageFieldsMetadata(params: Parameters<typeof getPackageFieldsMetadata>['0'], options?: Parameters<typeof getPackageFieldsMetadata>['1']): Promise<import("@kbn/fields-metadata-plugin/server").ExtractedIntegrationFields>;
    getLatestPackageInfo(packageName: string, prerelease?: boolean): Promise<import("../../types").PackageInfo>;
    getPackages(params?: {
        excludeInstallStatus?: boolean;
        category?: CategoryId;
        prerelease?: boolean;
    }): Promise<import("../../types").Installable<import("../../types").RegistrySearchResult & {
        title: string;
    } & {
        id: string;
    }>[]>;
    getInstalledPackages(params: TypeOf<typeof GetInstalledPackagesRequestSchema.query>): Promise<GetInstalledPackagesResponse>;
    reinstallEsAssets(packageInfo: InstallablePackage, assetPaths: string[]): Promise<InstalledAssetType[]>;
    rollbackPackage(options: {
        pkgName: string;
    }): Promise<RollbackPackageResponse>;
    getPackageAsset(assetPath: string, savedObjectsClient?: SavedObjectsClientContract): Promise<PackageAsset | undefined>;
}
export {};
