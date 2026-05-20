import type { PackageInfo, PackagePolicyInput } from '../types';
export declare const OTEL_INPUTS_MINIMUM_VERSION = "9.2.0";
/**
 * Returns true when the package has at least one OTel collector input, regardless
 * of whether it is an input-only package or a composable integration package.
 */
export declare const packageInfoHasOtelInputs: (packageInfo: PackageInfo | undefined) => boolean;
export declare const packagePolicyHasOtelInputs: (packagePolicyInputs: PackagePolicyInput[] | undefined) => boolean;
