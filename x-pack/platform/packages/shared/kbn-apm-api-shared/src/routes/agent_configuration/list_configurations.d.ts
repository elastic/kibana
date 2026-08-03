import type { AgentConfiguration } from '@kbn/apm-common';
export interface ListAgentConfigurationsResponse {
    configurations: AgentConfiguration[];
}
export declare const listAgentConfigurationsRoute: {
    endpoint: "GET /api/apm/settings/agent-configuration 2023-10-31";
    params?: undefined;
} & import("../types").WithResponse<ListAgentConfigurationsResponse>;
