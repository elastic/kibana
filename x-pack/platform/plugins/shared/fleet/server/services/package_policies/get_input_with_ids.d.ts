import type { NewPackagePolicy, PackageInfo, PackagePolicy } from '../../types';
/**
 * Populate the ids for inputs and streams of a package policy if they are not already set
 *
 * the option `allEnabled` is only used to generate inputs integration templates where everything is enabled by default
 * it shouldn't be used in the normal install flow
 */
export declare function getInputsWithIds(packagePolicy: NewPackagePolicy, packagePolicyId?: string, allEnabled?: boolean, packageInfo?: PackageInfo): PackagePolicy['inputs'];
