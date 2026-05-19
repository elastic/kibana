import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { MessageSigningError } from '../../common/errors';
import type { PreconfigurationError } from '../../common/constants';
import type { DefaultPackagesInstallationError } from '../../common/types';
import type { UpgradeManagedPackagePoliciesResult } from './setup/managed_package_policies';
import type { UninstallTokenInvalidError } from './security/uninstall_token_service';
export interface SetupStatus {
    isInitialized: boolean;
    nonFatalErrors: Array<PreconfigurationError | DefaultPackagesInstallationError | UpgradeManagedPackagePoliciesResult | UninstallTokenInvalidError | {
        error: MessageSigningError;
    }>;
}
export declare function _runSetupWithLock(setupFn: () => Promise<SetupStatus>): Promise<SetupStatus>;
export declare function setupFleet(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, options?: {
    useLock: boolean;
}): Promise<SetupStatus>;
/**
 * Maps the `nonFatalErrors` object returned by the setup process to a more readable
 * and predictable format suitable for logging output or UI presentation.
 */
export declare function formatNonFatalErrors(nonFatalErrors: SetupStatus['nonFatalErrors']): Array<{
    name: string;
    message: string;
}>;
/**
 * Confirm existence of various directories used by Fleet and warn if they don't exist
 */
export declare function ensureFleetDirectories(): Promise<void>;
