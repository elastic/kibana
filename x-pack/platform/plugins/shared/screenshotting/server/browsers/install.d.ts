import type { Logger } from '@kbn/core/server';
import type { ChromiumArchivePaths, PackageInfo } from '@kbn/screenshotting-server';
type BinaryPath = string;
/**
 * "install" a browser by type into installs path by extracting the downloaded
 * archive. If there is an error extracting the archive an `ExtractError` is thrown
 */
export declare function install(paths: ChromiumArchivePaths, logger: Logger, pkg: PackageInfo, chromiumPath?: string): Promise<BinaryPath>;
export {};
