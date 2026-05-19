import type { PackageInfo, DeprecationInfo } from '../../../../common/types';
/**
 * Compares two package versions and returns true if the target version
 * introduces deprecations that are not present in the current version.
 *
 * Returns false if the current version already has the same deprecations
 * (to avoid blocking upgrades within an already-deprecated line).
 */
export declare function hasNewDeprecations(currentPkg: PackageInfo, targetPkg: PackageInfo): boolean;
/**
 * Extracts a human-readable summary of the first deprecation found
 * in the target package info, for display in the UI.
 */
export declare function getDeprecationDetails(pkg: PackageInfo): DeprecationInfo | undefined;
