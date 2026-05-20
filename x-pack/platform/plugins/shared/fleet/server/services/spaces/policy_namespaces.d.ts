import type { PackagePolicy } from '../../types';
export { isNamespaceAllowedByPrefixes } from '../../../common/services/namespace_prefixes';
/**
 * Returns the allowed namespace prefixes for the given Kibana space, or `null`
 * if no restriction applies (space awareness disabled or no prefixes configured).
 */
export declare function getAllowedNamespacePrefixesForSpace(spaceId?: string): Promise<string[] | null>;
export declare function validatePolicyNamespaceForSpace({ namespace, spaceId, }: {
    namespace: string;
    spaceId?: string;
}): Promise<void>;
export declare function validateAdditionalDatastreamsPermissionsForSpace({ additionalDatastreamsPermissions, spaceId, }: {
    additionalDatastreamsPermissions?: string[];
    spaceId?: string;
}): Promise<void>;
export declare function validatePackagePoliciesUniqueNameAcrossSpaces(packagePolicies: PackagePolicy[], newSpaceIds?: string[]): Promise<void>;
