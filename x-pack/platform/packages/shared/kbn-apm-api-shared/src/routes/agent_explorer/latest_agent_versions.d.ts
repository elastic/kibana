import type { AgentName, ElasticApmAgentLatestVersion, OtelAgentLatestVersion } from '@kbn/apm-types';
type AgentLatestVersions = Record<AgentName, ElasticApmAgentLatestVersion | OtelAgentLatestVersion>;
export interface AgentLatestVersionsResponse {
    data: AgentLatestVersions;
    error?: {
        message: string;
        type?: string;
        statusCode?: string;
    };
}
export declare const latestAgentVersionsRoute: {
    endpoint: "GET /internal/apm/get_latest_agent_versions";
    params?: undefined;
} & import("../types").WithResponse<AgentLatestVersionsResponse>;
export {};
