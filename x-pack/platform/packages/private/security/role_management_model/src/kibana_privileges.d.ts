import type { KibanaFeature } from '@kbn/features-plugin/common';
import type { RawKibanaPrivileges, RoleKibanaPrivilege } from '@kbn/security-plugin-types-common';
import type { KibanaPrivilege } from './kibana_privilege';
import type { PrivilegeCollection } from './privilege_collection';
import type { SecuredFeature } from './secured_feature';
/**
 * Determines if the passed privilege spec defines global privileges.
 * @param privilegeSpec
 */
export declare function isGlobalPrivilegeDefinition(privilegeSpec: RoleKibanaPrivilege): boolean;
export declare class KibanaPrivileges {
    private global;
    private spaces;
    private feature;
    constructor(rawKibanaPrivileges: RawKibanaPrivileges, features: KibanaFeature[]);
    getBasePrivileges(entry: RoleKibanaPrivilege): KibanaPrivilege[];
    getSecuredFeature(featureId: string): SecuredFeature;
    getSecuredFeatures(): SecuredFeature[];
    createCollectionFromRoleKibanaPrivileges(roleKibanaPrivileges: RoleKibanaPrivilege[]): PrivilegeCollection;
    private getFeaturePrivileges;
}
