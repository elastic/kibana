import type Boom from '@hapi/boom';
import type { ElasticsearchClient, SavedObject, SavedObjectsClientContract, Logger, KibanaRequest } from '@kbn/core/server';
import type { KibanaAssetReference, PackageDataStreamTypes, PackageDependencies, PackageInstallContext } from '../../../../common/types';
import type { BulkInstallPackageInfo, EpmPackageInstallStatus, InstallablePackage, Installation, InstallResult, InstallSource, InstallType, KibanaAssetType, PackageVerificationResult, InstallResultStatus } from '../../../types';
import { FleetError } from '../../../errors';
import type { ArchiveAsset } from '../kibana/assets/install';
import type { PackageUpdateEvent } from '../../upgrade_sender';
export declare const UPLOAD_RETRY_AFTER_MS = 10000;
export declare const PACKAGES_TO_INSTALL_WITH_STREAMING: string[];
export declare function isPackageInstalled(options: {
    savedObjectsClient: SavedObjectsClientContract;
    pkgName: string;
}): Promise<boolean>;
/**
 * Check if a package is currently installed,
 * if the package is currently installing it will retry until MAX_ENSURE_INSTALL_TIME is reached
 */
export declare function isPackageVersionOrLaterInstalled(options: {
    savedObjectsClient: SavedObjectsClientContract;
    pkgName: string;
    pkgVersion: string;
}): Promise<{
    package: Installation;
} | false>;
export interface EnsurePackageResult {
    status: InstallResultStatus;
    package: Installation;
}
export declare function ensureInstalledPackage(options: {
    savedObjectsClient: SavedObjectsClientContract;
    pkgName: string;
    esClient: ElasticsearchClient;
    pkgVersion?: string;
    spaceId?: string;
    force?: boolean;
    request?: KibanaRequest;
}): Promise<EnsurePackageResult>;
export declare function handleInstallPackageFailure({ savedObjectsClient, error, pkgName, pkgVersion, installedPkg, esClient, spaceId, request, keepFailedInstallation, }: {
    savedObjectsClient: SavedObjectsClientContract;
    error: FleetError | Boom.Boom | Error;
    pkgName: string;
    pkgVersion: string;
    installedPkg: SavedObject<Installation> | undefined;
    esClient: ElasticsearchClient;
    spaceId: string;
    request?: KibanaRequest;
    keepFailedInstallation?: boolean;
}): Promise<void>;
export interface IBulkInstallPackageError {
    name: string;
    error: Error;
    installType?: InstallType;
}
export type BulkInstallResponse = BulkInstallPackageInfo | IBulkInstallPackageError;
interface InstallRegistryPackageParams {
    savedObjectsClient: SavedObjectsClientContract;
    pkgkey: string;
    esClient: ElasticsearchClient;
    spaceId: string;
    force?: boolean;
    neverIgnoreVerificationError?: boolean;
    ignoreConstraints?: boolean;
    prerelease?: boolean;
    request?: KibanaRequest;
    ignoreMappingUpdateErrors?: boolean;
    skipDataStreamRollover?: boolean;
    retryFromLastState?: boolean;
    keepFailedInstallation?: boolean;
    useStreaming?: boolean;
    automaticInstall?: boolean;
    installedAsDependencyOf?: {
        name: string;
        version: string;
    };
    skipDependencyCheck?: boolean;
}
export interface CustomPackageDatasetConfiguration {
    name: string;
    type: PackageDataStreamTypes;
}
interface InstallCustomPackageParams {
    savedObjectsClient: SavedObjectsClientContract;
    pkgName: string;
    datasets: CustomPackageDatasetConfiguration[];
    esClient: ElasticsearchClient;
    spaceId: string;
    force?: boolean;
    request?: KibanaRequest;
    kibanaVersion: string;
}
interface InstallUploadedArchiveParams {
    savedObjectsClient: SavedObjectsClientContract;
    esClient: ElasticsearchClient;
    archiveBuffer: Buffer;
    contentType: string;
    spaceId: string;
    version?: string;
    request?: KibanaRequest;
    ignoreMappingUpdateErrors?: boolean;
    skipDataStreamRollover?: boolean;
    isBundledPackage?: boolean;
    skipRateLimitCheck?: boolean;
}
export declare function installPackageWithStateMachine(options: {
    pkgName: string;
    pkgVersion: string;
    installSource: InstallSource;
    installedPkg?: SavedObject<Installation>;
    installType: InstallType;
    savedObjectsClient: SavedObjectsClientContract;
    esClient: ElasticsearchClient;
    spaceId: string;
    force?: boolean;
    packageInstallContext: PackageInstallContext;
    paths: string[];
    verificationResult?: PackageVerificationResult;
    telemetryEvent?: PackageUpdateEvent;
    request?: KibanaRequest;
    ignoreMappingUpdateErrors?: boolean;
    skipDataStreamRollover?: boolean;
    retryFromLastState?: boolean;
    useStreaming?: boolean;
    keepFailedInstallation?: boolean;
    automaticInstall?: boolean;
    installedAsDependencyOf?: {
        name: string;
        version: string;
    };
    skipDependencyCheck?: boolean;
}): Promise<InstallResult>;
export type InstallPackageParams = {
    spaceId: string;
    neverIgnoreVerificationError?: boolean;
    retryFromLastState?: boolean;
    skipDependencyCheck?: boolean;
} & (({
    installSource: Extract<InstallSource, 'registry'>;
} & InstallRegistryPackageParams) | ({
    installSource: Extract<InstallSource, 'upload'>;
} & InstallUploadedArchiveParams) | ({
    installSource: Extract<InstallSource, 'bundled'>;
} & InstallUploadedArchiveParams) | ({
    installSource: Extract<InstallSource, 'custom'>;
} & InstallCustomPackageParams));
/**
 * Entrypoint function for installing packages; this function gets also called by the POST epm/packages handler
 */
export declare function installPackage(args: InstallPackageParams): Promise<InstallResult>;
export declare function installCustomPackage(args: InstallCustomPackageParams): Promise<InstallResult>;
export declare const updateVersion: (savedObjectsClient: SavedObjectsClientContract, pkgName: string, pkgVersion: string) => Promise<import("@kbn/core/server").SavedObjectsUpdateResponse<{
    version: string;
}>>;
export declare const updateInstallStatusToFailed: ({ logger, savedObjectsClient, pkgName, status, latestInstallFailedAttempts, }: {
    logger: Logger;
    savedObjectsClient: SavedObjectsClientContract;
    pkgName: string;
    status: EpmPackageInstallStatus;
    latestInstallFailedAttempts: any;
}) => Promise<import("@kbn/core/server").SavedObjectsUpdateResponse<{
    install_status: "installed" | "installing" | "install_failed";
    latest_install_failed_attempts: any;
}> | undefined>;
export declare function restartInstallation(options: {
    savedObjectsClient: SavedObjectsClientContract;
    pkgName: string;
    pkgVersion: string;
    installSource: InstallSource;
    verificationResult?: PackageVerificationResult;
    previousVersion?: string | null;
    installedAsDependencyOf?: {
        name: string;
        version: string;
    };
    existingIsDependencyOf?: {
        name: string;
        version: string;
    }[];
    dependencies?: PackageDependencies | null;
}): Promise<void>;
export declare function createInstallation(options: {
    savedObjectsClient: SavedObjectsClientContract;
    packageInfo: InstallablePackage;
    installSource: InstallSource;
    spaceId: string;
    verificationResult?: PackageVerificationResult;
    installedAsDependencyOf?: {
        name: string;
        version: string;
    };
    dependencies?: PackageDependencies | null;
}): Promise<SavedObject<Installation>>;
export declare const kibanaAssetsToAssetsRef: (kibanaAssets: Record<KibanaAssetType, ArchiveAsset[]>) => KibanaAssetReference[];
export declare const saveKibanaAssetsRefs: (savedObjectsClient: SavedObjectsClientContract, pkgName: string, assetRefs: KibanaAssetReference[] | null, saveAsAdditionnalSpace?: boolean, append?: boolean) => Promise<KibanaAssetReference[]>;
export declare function ensurePackagesCompletedInstall(savedObjectsClient: SavedObjectsClientContract, esClient: ElasticsearchClient): Promise<import("@kbn/core/server").SavedObjectsFindResponse<Installation, unknown>>;
interface NoPkgArgs {
    pkgVersion: string;
    installedPkg?: undefined;
}
interface HasPkgArgs {
    pkgVersion: string;
    installedPkg: SavedObject<Installation>;
}
type OnlyInstall = Extract<InstallType, 'install'>;
type NotInstall = Exclude<InstallType, 'install'>;
export declare function getInstallType(args: NoPkgArgs): OnlyInstall;
export declare function getInstallType(args: HasPkgArgs): NotInstall;
export declare function getInstallType(args: NoPkgArgs | HasPkgArgs): OnlyInstall | NotInstall;
export {};
