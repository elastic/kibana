import type { ApiKey } from '@kbn/security-plugin-types-common';
export interface AgentKeysResponse {
    agentKeys: ApiKey[];
}
export declare const agentKeysRoute: {
    endpoint: "GET /internal/apm/agent_keys";
    params?: undefined;
} & import("../types").WithResponse<AgentKeysResponse>;
