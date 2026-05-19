import type { PackageInfo, PackagePolicy } from '../types';
/**
 * Return true if a package need Elastic Agent to be run as root/administrator
 */
export declare function isRootPrivilegesRequired(packageInfo: PackageInfo): boolean | undefined;
export declare function isRootPrivilegeRequired(packagePolicies: PackagePolicy[]): boolean;
export declare function getRootPrivilegedDataStreams(packageInfo: PackageInfo): Array<{
    name: string;
    title: string;
}>;
export declare function getRootIntegrations(packagePolicies: PackagePolicy[]): Array<{
    name: string;
    title: string;
}>;
export declare function hasInstallServersInputs(packagePolicies: PackagePolicy[]): boolean;
/**
 * Return true if a package is fips compatible.
 * Policy templates that have fips_compatible not defined are considered compatible.
 * Only `fips_compatible: false` is considered not compatible, except for OTel inputs
 * that are considered incompatible by default.
 */
export declare function checkIntegrationFipsLooseCompatibility(integrationName: string, packageInfo?: Pick<PackageInfo, 'policy_templates'>): boolean;
/**
 * Given a package policy list, get the list of integrations that are explicitly marked as not compatible with FIPS
 *
 */
export declare function getNonFipsIntegrations(packagePolicies: PackagePolicy[]): Array<{
    name: string;
    title: string;
}>;
