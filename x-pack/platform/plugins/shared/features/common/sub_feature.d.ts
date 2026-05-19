import type { RecursiveReadonly } from '@kbn/utility-types';
import type { LicenseType } from '@kbn/licensing-types';
import type { FeatureKibanaPrivilegesReference } from './feature_kibana_privileges_reference';
import type { FeatureKibanaPrivileges } from './feature_kibana_privileges';
/**
 * Configuration for a sub-feature.
 */
export interface SubFeatureConfig {
    /** Display name for this sub-feature */
    name: string;
    /**
     * Whether or not this privilege should only be granted to `All Spaces *`. Should be used for features that do not
     * support Spaces. Defaults to `false`.
     */
    requireAllSpaces?: boolean;
    /**
     * Optional message to display on the Role Management screen when configuring permissions for this feature.
     */
    privilegesTooltip?: string;
    /** Collection of privilege groups */
    privilegeGroups: readonly SubFeaturePrivilegeGroupConfig[];
    /**
     * An optional description that will appear as subtext underneath the sub-feature name
     */
    description?: string;
}
/**
 * The type of privilege group.
 * - `mutually_exclusive`::
 *     Users will be able to select at most one privilege within this group.
 *     Privileges must be specified in descending order of permissiveness (e.g. `All`, `Read`, not `Read`, `All)
 * - `independent`::
 *     Users will be able to select any combination of privileges within this group.
 */
export type SubFeaturePrivilegeGroupType = 'mutually_exclusive' | 'independent';
/**
 * Configuration for a sub-feature privilege group.
 */
export interface SubFeaturePrivilegeGroupConfig {
    /**
     * The type of privilege group.
     * - `mutually_exclusive`::
     *     Users will be able to select at most one privilege within this group.
     *     Privileges must be specified in descending order of permissiveness (e.g. `All`, `Read`, not `Read`, `All)
     * - `independent`::
     *     Users will be able to select any combination of privileges within this group.
     */
    groupType: SubFeaturePrivilegeGroupType;
    /**
     * The privileges which belong to this group.
     */
    privileges: readonly SubFeaturePrivilegeConfig[];
}
/**
 * Configuration for a sub-feature privilege.
 */
export interface SubFeaturePrivilegeConfig extends Omit<FeatureKibanaPrivileges, 'excludeFromBasePrivileges' | 'composedOf' | 'replacedBy'> {
    /**
     * Identifier for this privilege. Must be unique across all other privileges within a feature.
     */
    id: string;
    /**
     * The display name for this privilege.
     */
    name: string;
    /**
     * Denotes which Primary Feature Privilege this sub-feature privilege should be included in.
     * `read` is also included in `all` automatically.
     */
    includeIn: 'all' | 'read' | 'none';
    /**
     * The minimum supported license level for this sub-feature privilege.
     * If no license level is supplied, then this privilege will be available for all licences
     * that are valid for the overall feature.
     */
    minimumLicense?: LicenseType;
    /**
     * An optional list of other registered feature or sub-feature privileges that, when combined, grant equivalent access
     * if the feature this sub-feature privilege belongs to becomes deprecated. This property can only be set if the
     * feature is marked as deprecated.
     */
    replacedBy?: readonly FeatureKibanaPrivilegesReference[];
}
export declare class SubFeature {
    protected readonly config: RecursiveReadonly<SubFeatureConfig>;
    constructor(config: RecursiveReadonly<SubFeatureConfig>);
    get name(): string;
    get privilegeGroups(): readonly Readonly<{
        groupType: SubFeaturePrivilegeGroupType;
        privileges: readonly Readonly<{
            id: string;
            name: string;
            includeIn: "all" | "read" | "none";
            minimumLicense?: LicenseType | undefined;
            replacedBy?: readonly Readonly<{
                feature: string;
                privileges: readonly string[];
            }>[] | undefined;
            alerting?: Readonly<{
                rule?: Readonly<{
                    all?: readonly Readonly<{
                        ruleTypeId: string;
                        consumers: readonly string[];
                    }>[] | undefined;
                    read?: readonly Readonly<{
                        ruleTypeId: string;
                        consumers: readonly string[];
                    }>[] | undefined;
                    enable?: readonly Readonly<{
                        ruleTypeId: string;
                        consumers: readonly string[];
                    }>[] | undefined;
                    manual_run?: readonly Readonly<{
                        ruleTypeId: string;
                        consumers: readonly string[];
                    }>[] | undefined;
                    manage_rule_settings?: readonly Readonly<{
                        ruleTypeId: string;
                        consumers: readonly string[];
                    }>[] | undefined;
                }> | undefined;
                alert?: Readonly<{
                    all?: readonly Readonly<{
                        ruleTypeId: string;
                        consumers: readonly string[];
                    }>[] | undefined;
                    read?: readonly Readonly<{
                        ruleTypeId: string;
                        consumers: readonly string[];
                    }>[] | undefined;
                }> | undefined;
            }> | undefined;
            cases?: Readonly<{
                all?: readonly string[] | undefined;
                push?: readonly string[] | undefined;
                create?: readonly string[] | undefined;
                read?: readonly string[] | undefined;
                update?: readonly string[] | undefined;
                delete?: readonly string[] | undefined;
                settings?: readonly string[] | undefined;
                createComment?: readonly string[] | undefined;
                reopenCase?: readonly string[] | undefined;
                assign?: readonly string[] | undefined;
                manageTemplates?: readonly string[] | undefined;
            }> | undefined;
            disabled?: boolean | undefined;
            app?: readonly string[] | undefined;
            api?: readonly string[] | undefined;
            management?: Readonly<{
                [x: string]: readonly string[];
            }> | undefined;
            catalogue?: readonly string[] | undefined;
            ui: readonly string[];
            requireAllSpaces?: boolean | undefined;
            savedObject: Readonly<{
                all: readonly string[];
                read: readonly string[];
            }>;
        }>[];
    }>[];
    get requireAllSpaces(): boolean;
    get description(): string;
    toRaw(): {
        name: string;
        requireAllSpaces?: boolean;
        privilegesTooltip?: string;
        privilegeGroups: readonly Readonly<{
            groupType: SubFeaturePrivilegeGroupType;
            privileges: readonly Readonly<{
                id: string;
                name: string;
                includeIn: "all" | "read" | "none";
                minimumLicense?: LicenseType | undefined;
                replacedBy?: readonly Readonly<{
                    feature: string;
                    privileges: readonly string[];
                }>[] | undefined;
                alerting?: Readonly<{
                    rule?: Readonly<{
                        all?: readonly Readonly<{
                            ruleTypeId: string;
                            consumers: readonly string[];
                        }>[] | undefined;
                        read?: readonly Readonly<{
                            ruleTypeId: string;
                            consumers: readonly string[];
                        }>[] | undefined;
                        enable?: readonly Readonly<{
                            ruleTypeId: string;
                            consumers: readonly string[];
                        }>[] | undefined;
                        manual_run?: readonly Readonly<{
                            ruleTypeId: string;
                            consumers: readonly string[];
                        }>[] | undefined;
                        manage_rule_settings?: readonly Readonly<{
                            ruleTypeId: string;
                            consumers: readonly string[];
                        }>[] | undefined;
                    }> | undefined;
                    alert?: Readonly<{
                        all?: readonly Readonly<{
                            ruleTypeId: string;
                            consumers: readonly string[];
                        }>[] | undefined;
                        read?: readonly Readonly<{
                            ruleTypeId: string;
                            consumers: readonly string[];
                        }>[] | undefined;
                    }> | undefined;
                }> | undefined;
                cases?: Readonly<{
                    all?: readonly string[] | undefined;
                    push?: readonly string[] | undefined;
                    create?: readonly string[] | undefined;
                    read?: readonly string[] | undefined;
                    update?: readonly string[] | undefined;
                    delete?: readonly string[] | undefined;
                    settings?: readonly string[] | undefined;
                    createComment?: readonly string[] | undefined;
                    reopenCase?: readonly string[] | undefined;
                    assign?: readonly string[] | undefined;
                    manageTemplates?: readonly string[] | undefined;
                }> | undefined;
                disabled?: boolean | undefined;
                app?: readonly string[] | undefined;
                api?: readonly string[] | undefined;
                management?: Readonly<{
                    [x: string]: readonly string[];
                }> | undefined;
                catalogue?: readonly string[] | undefined;
                ui: readonly string[];
                requireAllSpaces?: boolean | undefined;
                savedObject: Readonly<{
                    all: readonly string[];
                    read: readonly string[];
                }>;
            }>[];
        }>[];
        description?: string;
    };
}
