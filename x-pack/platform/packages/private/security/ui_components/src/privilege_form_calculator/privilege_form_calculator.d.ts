import type { Role } from '@kbn/security-plugin-types-common';
import { type KibanaPrivileges, type SubFeaturePrivilegeGroup } from '@kbn/security-role-management-model';
/**
 * Calculator responsible for determining the displayed and effective privilege values for the following interfaces:
 * - <PrivilegeSpaceForm> and children
 * - <PrivilegeSpaceTable> and children
 */
export declare class PrivilegeFormCalculator {
    private readonly kibanaPrivileges;
    private readonly role;
    constructor(kibanaPrivileges: KibanaPrivileges, role: Role);
    /**
     * Returns the assigned base privilege.
     * If more than one base privilege is assigned, the most permissive privilege will be returned.
     * If no base privileges are assigned, then this will return `undefined`.
     *
     * @param privilegeIndex the index of the kibana privileges role component
     */
    getBasePrivilege(privilegeIndex: number): import("@kbn/security-role-management-model").KibanaPrivilege | undefined;
    /**
     * Returns true if it is base wildcard (*) privilege.
     *
     * @param privilegeIndex the index of the kibana privileges role component
     */
    isWildcardBasePrivilege(privilegeIndex: number): boolean;
    /**
     * Returns the ID of the *displayed* Primary Feature Privilege for the indicated feature and privilege index.
     * If the effective primary feature privilege is a "minimal" version, then this returns the corresponding non-minimal version.
     *
     * @example
     * The following kibana privilege entry will return `read`:
     * ```ts
     * const entry = {
     *    base: [],
     *    feature: {
     *       some_feature: ['minimal_read'],
     *    }
     * }
     * ```
     *
     * @param featureId the feature id to get the Primary Feature KibanaPrivilege for.
     * @param privilegeIndex the index of the kibana privileges role component
     * @param allSpacesSelected indicates if the privilege form is configured to grant access to all spaces.
     */
    getDisplayedPrimaryFeaturePrivilegeId(featureId: string, privilegeIndex: number, allSpacesSelected: boolean): string | undefined;
    /**
     * Determines if the indicated feature has sub-feature privilege assignments which differ from the "displayed" primary feature privilege.
     *
     * @param featureId the feature id
     * @param privilegeIndex the index of the kibana privileges role component
     * @param allSpacesSelected indicates if the privilege form is configured to grant access to all spaces.
     */
    hasCustomizedSubFeaturePrivileges(featureId: string, privilegeIndex: number, allSpacesSelected: boolean): boolean;
    /**
     * Returns the most permissive effective Primary Feature KibanaPrivilege, including the minimal versions.
     *
     * @param featureId the feature id
     * @param privilegeIndex the index of the kibana privileges role component
     * @param allSpacesSelected indicates if the privilege form is configured to grant access to all spaces.
     */
    getEffectivePrimaryFeaturePrivilege(featureId: string, privilegeIndex: number, allSpacesSelected?: boolean): import("@kbn/security-role-management-model").PrimaryFeaturePrivilege | undefined;
    /**
     * Determines if the indicated sub-feature privilege is granted.
     *
     * @param featureId the feature id
     * @param privilegeId the sub feature privilege id
     * @param privilegeIndex the index of the kibana privileges role component
     */
    isIndependentSubFeaturePrivilegeGranted(featureId: string, privilegeId: string, privilegeIndex: number): boolean;
    /**
     * Returns the most permissive effective privilege within the indicated mutually-exclusive sub feature privilege group.
     *
     * @param featureId the feature id
     * @param subFeatureGroup the mutually-exclusive sub feature group
     * @param privilegeIndex the index of the kibana privileges role component
     */
    getSelectedMutuallyExclusiveSubFeaturePrivilege(featureId: string, subFeatureGroup: SubFeaturePrivilegeGroup, privilegeIndex: number): import("@kbn/security-role-management-model").SubFeaturePrivilege | undefined;
    /**
     * Determines if the indicated feature is capable of having its sub-feature privileges customized.
     *
     * @param featureId the feature id
     * @param privilegeIndex the index of the kibana privileges role component
     */
    canCustomizeSubFeaturePrivileges(featureId: string, privilegeIndex: number): boolean;
    /**
     * Returns an updated set of feature privileges based on the toggling of the "Customize sub-feature privileges" control.
     *
     * @param featureId the feature id
     * @param privilegeIndex  the index of the kibana privileges role component
     * @param willBeCustomizing flag indicating if this feature is about to have its sub-feature privileges customized or not
     * @param allSpacesSelected indicates if the privilege form is configured to grant access to all spaces.
     */
    updateSelectedFeaturePrivilegesForCustomization(featureId: string, privilegeIndex: number, willBeCustomizing: boolean, allSpacesSelected: boolean): string[];
    /**
     * Determines if the indicated privilege entry is less permissive than the configured "global" entry for the role.
     * @param privilegeIndex the index of the kibana privileges role component
     */
    hasSupersededInheritedPrivileges(privilegeIndex: number): boolean;
    /**
     * Returns the *displayed* Primary Feature Privilege for the indicated feature and privilege index.
     * If the effective primary feature privilege is a "minimal" version, then this returns the corresponding non-minimal version.
     *
     * @example
     * The following kibana privilege entry will return `read`:
     * ```ts
     * const entry = {
     *    base: [],
     *    feature: {
     *       some_feature: ['minimal_read'],
     *    }
     * }
     * ```
     *
     * @param featureId the feature id to get the Primary Feature KibanaPrivilege for.
     * @param privilegeIndex the index of the kibana privileges role component
     * @param allSpacesSelected indicates if the privilege form is configured to grant access to all spaces.
     */
    private getDisplayedPrimaryFeaturePrivilege;
    private getSelectedFeaturePrivileges;
    private locateGlobalPrivilege;
}
