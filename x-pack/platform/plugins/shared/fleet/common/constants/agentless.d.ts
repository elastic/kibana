import type { MonitoringType } from '../types';
export declare const AGENTLESS_AGENT_POLICY_INACTIVITY_TIMEOUT = 3600;
export declare const AGENTLESS_AGENT_POLICY_MONITORING: MonitoringType;
export declare const AGENTLESS_GLOBAL_TAG_NAME_ORGANIZATION = "organization";
export declare const AGENTLESS_GLOBAL_TAG_NAME_DIVISION = "division";
export declare const AGENTLESS_GLOBAL_TAG_NAME_TEAM = "team";
export declare const MAXIMUM_RETRIES = 3;
export declare const RETRYABLE_HTTP_STATUSES: number[];
export declare const RETRYABLE_SERVER_CODES: string[];
export declare const AGENTLESS_ALLOWED_OUTPUT_TYPES: "elasticsearch"[];
export declare const AGENTLESS_API_ERROR_CODES: {
    OVER_PROVISIONED: string;
    FLEET_UNREACHABLE: string;
};
export declare const AGENTLESS_DISABLED_INPUTS: string[];
