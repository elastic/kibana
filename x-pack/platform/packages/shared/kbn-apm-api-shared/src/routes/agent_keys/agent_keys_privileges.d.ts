export interface AgentKeysPrivilegesResponse {
    areApiKeysEnabled: boolean;
    isAdmin: boolean;
    canManage: boolean;
}
export declare const agentKeysPrivilegesRoute: {
    endpoint: "GET /internal/apm/agent_keys/privileges";
    params?: undefined;
} & import("../types").WithResponse<AgentKeysPrivilegesResponse>;
