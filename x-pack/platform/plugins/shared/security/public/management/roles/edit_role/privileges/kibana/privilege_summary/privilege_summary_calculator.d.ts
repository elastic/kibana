import type { Role, RoleKibanaPrivilege } from '@kbn/security-plugin-types-common';
import { type KibanaPrivileges, type PrimaryFeaturePrivilege } from '@kbn/security-role-management-model';
export interface EffectiveFeaturePrivileges {
    [featureId: string]: {
        primary?: PrimaryFeaturePrivilege;
        subFeature: string[];
        hasCustomizedSubFeaturePrivileges: boolean;
    };
}
export declare class PrivilegeSummaryCalculator {
    private readonly kibanaPrivileges;
    private readonly role;
    constructor(kibanaPrivileges: KibanaPrivileges, role: Role);
    getEffectiveFeaturePrivileges(entry: RoleKibanaPrivilege): EffectiveFeaturePrivileges;
    private hasCustomizedSubFeaturePrivileges;
    private getDisplayedPrimaryFeaturePrivilege;
    private collectAssignedPrivileges;
    private locateGlobalPrivilege;
}
