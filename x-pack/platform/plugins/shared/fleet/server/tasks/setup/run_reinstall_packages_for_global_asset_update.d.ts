import type { Logger } from '@kbn/logging';
interface RunReinstallPackagesParams {
    abortController: AbortController;
    logger: Logger;
}
/**
 * Reinstalls all installed packages after global Fleet ES assets have been updated.
 * This ensures packages reference the latest global component templates and ingest pipelines.
 *
 * This task is scheduled when global assets (component templates, ingest pipelines) are
 * created or updated during Fleet setup, typically during a stack upgrade.
 */
export declare function runReinstallPackagesForGlobalAssetUpdate({ abortController, logger, }: RunReinstallPackagesParams): Promise<void>;
export {};
