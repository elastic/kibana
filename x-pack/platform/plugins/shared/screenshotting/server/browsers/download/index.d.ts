import type { Logger } from '@kbn/core/server';
import type { ChromiumArchivePaths, PackageInfo } from '@kbn/screenshotting-server';
type ValidChecksum = string;
/**
 * Clears the unexpected files in the browsers archivesPath
 * and ensures that all packages/archives are downloaded and
 * that their checksums match the declared value
 */
export declare function download(paths: ChromiumArchivePaths, pkg: PackageInfo, logger?: Logger): Promise<ValidChecksum | undefined>;
export {};
