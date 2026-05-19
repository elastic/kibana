export declare const LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE = "ingest-agent-policies";
export declare const AGENT_POLICY_SAVED_OBJECT_TYPE = "fleet-agent-policies";
export declare const AGENT_POLICY_INDEX = ".fleet-policies";
export declare const agentPolicyStatuses: {
    readonly Active: "active";
    readonly Inactive: "inactive";
};
export declare const AGENT_POLICY_DEFAULT_MONITORING_DATASETS: string[];
export declare const LICENSE_FOR_SCHEDULE_UPGRADE = "platinum";
export declare const LICENSE_FOR_AGENT_MIGRATION = "enterprise";
export declare const LICENSE_FOR_AGENT_ROLLBACK = "enterprise";
export declare const DEFAULT_MAX_AGENT_POLICIES_WITH_INACTIVITY_TIMEOUT = 750;
export declare const AGENT_LOG_LEVELS: readonly ["error", "warning", "info", "debug"];
export declare const DEFAULT_LOG_LEVEL: "info";
export declare const AGENT_POLICY_VERSION_SEPARATOR = "#";
