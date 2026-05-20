import type { PackagePolicy } from '../../../types';
/**
 * Get the cloud shell url from a package policy
 * It looks for a config with a cloud_shell_url object present in
 * the enabled inputs of the package policy
 */
export declare const getCloudShellUrlFromPackagePolicy: (packagePolicy?: PackagePolicy) => string | undefined;
