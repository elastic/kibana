import type { PackageInfo, PackageListItem } from '../types';
/**
 * Checks if a package has nested integrations by checking if it has more than one policy template.
 * @param pkgInfo - The package information.
 * @returns True if the package has nested integrations, false otherwise.
 */
export declare const doesPackageHaveIntegrations: (pkgInfo: PackageInfo | PackageListItem) => boolean;
