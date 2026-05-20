import type { AgentLogsState } from './agent_logs';
export declare const AGENT_LOG_INDEX_PATTERN = "logs-elastic_agent-*,logs-elastic_agent.*-*";
export declare const AGENT_DATASET = "elastic_agent";
export declare const AGENT_DATASET_FILEBEAT = "elastic_agent.filebeat";
export declare const AGENT_DATASET_METRICBEAT = "elastic_agent.metricbeat";
export declare const AGENT_DATASET_OSQUERYBEAT = "elastic_agent.osquerybeat";
export declare const AGENT_DATASET_HEARTBEAT = "elastic_agent.heartbeat";
export declare const AGENT_DATASET_APM_SERVER = "elastic_agent.apm_server";
export declare const AGENT_DATASET_ENDPOINT_SECURITY = "elastic_agent.endpoint_security";
export declare const AGENT_DATASET_PATTERN = "elastic_agent.*";
export declare const AGENT_ID_FIELD: {
    name: string;
    type: string;
};
export declare const DATASET_FIELD: {
    name: string;
    type: string;
    aggregatable: boolean;
    searchable: boolean;
};
export declare const LOG_LEVEL_FIELD: {
    name: string;
    type: string;
    aggregatable: boolean;
    searchable: boolean;
};
export declare const DEFAULT_DATE_RANGE: {
    start: string;
    end: string;
};
export declare const DEFAULT_LOGS_STATE: AgentLogsState;
export declare const STATE_STORAGE_KEY = "_q";
export declare const STATE_DATASET_FIELD = "datasets";
