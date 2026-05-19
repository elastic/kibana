import type { Logger } from '@kbn/logging';
interface RunUpgradePackageInstallVersionParams {
    abortController: AbortController;
    logger: Logger;
}
/**
 * Deferred task to upgrade package install versions for packages installed with an older version of Kibana.
 */
export declare function runUpgradePackageInstallVersion({ abortController, logger, }: RunUpgradePackageInstallVersionParams): Promise<void>;
export {};
