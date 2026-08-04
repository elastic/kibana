import type { FeatureKibanaPrivileges, SubFeatureConfig, SubFeaturePrivilegeConfig } from '@kbn/features-plugin/common';
type ValueOf<T> = T[keyof T];
type NestedValueOf<T extends Record<string, Record<string, string>>> = ValueOf<{
    [K in keyof T]: ValueOf<T[K]>;
}>;
/**
 * Single source of truth for alerting_v2 feature ids, API privilege strings,
 * UI capability keys, and future sub-feature definitions.
 *
 * Add all new alerting_v2 privilege strings here and derive from this file.
 */
export declare const ALERTING_V2_API_PRIVILEGES: {
    readonly rules: {
        readonly read: "read-alerting-v2-rules";
        readonly write: "write-alerting-v2-rules";
    };
    readonly alerts: {
        readonly read: "read-alerting-v2-alerts";
        readonly write: "write-alerting-v2-alerts";
    };
    readonly actionPolicies: {
        readonly read: "read-alerting-v2-action-policies";
        readonly write: "write-alerting-v2-action-policies";
    };
    readonly executionHistory: {
        readonly read: "read-alerting-v2-execution-history";
    };
};
/**
 * Top-level UI capability keys per feature. Each feature owns its own
 * `all` / `read` capability strings. Granted entries surface at runtime as
 * `capabilities[featureId][capabilityKey]`. Extend per-feature when a feature
 * needs additional top-level UI flags beyond the primary read/write split.
 */
export declare const ALERTING_V2_UI_CAPABILITIES: {
    readonly rules: {
        readonly all: "all";
        readonly read: "read";
    };
    readonly alerts: {
        readonly all: "all";
        readonly read: "read";
    };
    readonly actionPolicies: {
        readonly all: "all";
        readonly read: "read";
    };
    readonly executionHistory: {
        readonly all: "all";
        readonly read: "read";
    };
};
/**
 * Sub-feature-only UI capability keys per feature. Add new sub-feature UI
 * capabilities here (e.g. `alerts: { assignAlert: 'assignAlert' }`) so the
 * sub-feature privilege schema stays type-checked against the catalog.
 */
export declare const ALERTING_V2_SUB_FEATURE_UI_CAPABILITIES: {
    readonly rules: {};
    readonly alerts: {};
    readonly actionPolicies: {};
    readonly executionHistory: {};
};
type AlertingV2ApiPrivilege = NestedValueOf<typeof ALERTING_V2_API_PRIVILEGES>;
type AlertingV2TopLevelUICapability = NestedValueOf<typeof ALERTING_V2_UI_CAPABILITIES>;
type AlertingV2SubFeatureUICapability = NestedValueOf<typeof ALERTING_V2_SUB_FEATURE_UI_CAPABILITIES>;
type AlertingV2UICapability = AlertingV2TopLevelUICapability | AlertingV2SubFeatureUICapability;
type AlertingV2FeaturePrivilege = Pick<FeatureKibanaPrivileges, 'api' | 'ui' | 'savedObject' | 'alerts'> & {
    readonly api: readonly AlertingV2ApiPrivilege[];
    readonly ui: readonly AlertingV2TopLevelUICapability[];
    readonly savedObject: {
        readonly all: readonly string[];
        readonly read: readonly string[];
    };
};
type AlertingV2SubFeaturePrivilege = Omit<SubFeaturePrivilegeConfig, 'api' | 'ui' | 'savedObject'> & {
    readonly api: readonly AlertingV2ApiPrivilege[];
    readonly ui: readonly AlertingV2UICapability[];
    readonly savedObject: {
        readonly all: readonly string[];
        readonly read: readonly string[];
    };
};
type AlertingV2SubFeature = Omit<SubFeatureConfig, 'privilegeGroups'> & {
    readonly privilegeGroups: ReadonlyArray<{
        readonly groupType: 'independent' | 'mutually_exclusive';
        readonly privileges: readonly AlertingV2SubFeaturePrivilege[];
    }>;
};
export interface AlertingV2FeatureDefinition {
    readonly id: string;
    readonly name: string;
    readonly managementApp: string;
    readonly privileges: {
        readonly all: AlertingV2FeaturePrivilege;
        readonly read: AlertingV2FeaturePrivilege;
    };
    readonly subFeatures: readonly AlertingV2SubFeature[];
}
export declare const ALERTING_V2_FEATURES: {
    readonly rules: {
        readonly id: "alerting_v2_rules";
        readonly name: "Rules";
        readonly managementApp: "rules";
        readonly privileges: {
            readonly all: {
                readonly api: readonly ["read-alerting-v2-rules", "write-alerting-v2-rules"];
                readonly ui: readonly ["all", "read"];
                readonly savedObject: {
                    readonly all: readonly ["alerting_rule"];
                    readonly read: readonly [];
                };
            };
            readonly read: {
                readonly api: readonly ["read-alerting-v2-rules"];
                readonly ui: readonly ["read"];
                readonly savedObject: {
                    readonly all: readonly [];
                    readonly read: readonly ["alerting_rule"];
                };
            };
        };
        readonly subFeatures: readonly [];
    };
    readonly alerts: {
        readonly id: "alerting_v2_alerts";
        readonly name: "Alerts";
        readonly managementApp: "episodes";
        readonly privileges: {
            readonly all: {
                readonly alerts: {
                    readonly read: true;
                };
                readonly api: readonly ["read-alerting-v2-alerts", "write-alerting-v2-alerts"];
                readonly ui: readonly ["all", "read"];
                readonly savedObject: {
                    readonly all: readonly [];
                    readonly read: readonly [];
                };
            };
            readonly read: {
                readonly alerts: {
                    readonly read: true;
                };
                readonly api: readonly ["read-alerting-v2-alerts"];
                readonly ui: readonly ["read"];
                readonly savedObject: {
                    readonly all: readonly [];
                    readonly read: readonly [];
                };
            };
        };
        readonly subFeatures: readonly [];
    };
    readonly actionPolicies: {
        readonly id: "alerting_v2_action_policies";
        readonly name: "Action Policies";
        readonly managementApp: "action_policies";
        readonly privileges: {
            readonly all: {
                readonly api: readonly ["read-alerting-v2-action-policies", "write-alerting-v2-action-policies"];
                readonly ui: readonly ["all", "read"];
                readonly savedObject: {
                    readonly all: readonly ["alerting_action_policy"];
                    readonly read: readonly [];
                };
            };
            readonly read: {
                readonly api: readonly ["read-alerting-v2-action-policies"];
                readonly ui: readonly ["read"];
                readonly savedObject: {
                    readonly all: readonly [];
                    readonly read: readonly ["alerting_action_policy"];
                };
            };
        };
        readonly subFeatures: readonly [];
    };
    readonly executionHistory: {
        readonly id: "alerting_v2_execution_history";
        readonly name: "Execution history";
        readonly managementApp: "execution_history";
        readonly privileges: {
            readonly all: {
                readonly api: readonly ["read-alerting-v2-execution-history"];
                readonly ui: readonly ["all", "read"];
                readonly savedObject: {
                    readonly all: readonly [];
                    readonly read: readonly [];
                };
            };
            readonly read: {
                readonly api: readonly ["read-alerting-v2-execution-history"];
                readonly ui: readonly ["read"];
                readonly savedObject: {
                    readonly all: readonly [];
                    readonly read: readonly [];
                };
            };
        };
        readonly subFeatures: readonly [];
    };
};
export type AlertingV2Feature = keyof typeof ALERTING_V2_FEATURES;
type TopLevelUiOf<F extends AlertingV2Feature> = (typeof ALERTING_V2_FEATURES)[F]['privileges']['all']['ui'][number] | (typeof ALERTING_V2_FEATURES)[F]['privileges']['read']['ui'][number];
type SubFeatureUiOf<F extends AlertingV2Feature> = (typeof ALERTING_V2_FEATURES)[F]['subFeatures'][number]['privilegeGroups'][number]['privileges'][number]['ui'][number];
export type AlertingV2UICapabilityFor<F extends AlertingV2Feature> = TopLevelUiOf<F> | SubFeatureUiOf<F>;
export {};
