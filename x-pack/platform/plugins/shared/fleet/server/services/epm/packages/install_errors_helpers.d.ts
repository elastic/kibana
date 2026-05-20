import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { Logger } from '@kbn/core/server';
import type { InstallFailedAttempt, InstallSource } from '../../../types';
export declare function clearLatestFailedAttempts(installedVersion: string, latestAttempts?: InstallFailedAttempt[]): InstallFailedAttempt[];
export declare function addErrorToLatestFailedAttempts({ error, createdAt, targetVersion, latestAttempts, }: {
    createdAt: string;
    targetVersion: string;
    error: Error;
    latestAttempts?: InstallFailedAttempt[];
}): InstallFailedAttempt[];
export declare const createOrUpdateFailedInstallStatus: ({ logger, savedObjectsClient, pkgName, pkgVersion, error, installSource, }: {
    logger: Logger;
    savedObjectsClient: SavedObjectsClientContract;
    pkgName: string;
    pkgVersion: string;
    error: Error;
    installSource?: InstallSource;
}) => Promise<import("@kbn/core/server").SavedObjectsUpdateResponse<{
    latest_install_failed_attempts: InstallFailedAttempt[];
}> | undefined>;
