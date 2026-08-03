export declare const agentKeysRouteDefinitions: {
    agentKeys: {
        endpoint: "GET /internal/apm/agent_keys";
        params?: undefined;
    } & import("../types").WithResponse<import("./agent_keys").AgentKeysResponse>;
    agentKeysPrivileges: {
        endpoint: "GET /internal/apm/agent_keys/privileges";
        params?: undefined;
    } & import("../types").WithResponse<import("./agent_keys_privileges").AgentKeysPrivilegesResponse>;
    invalidateAgentKey: {
        endpoint: "POST /internal/apm/api_key/invalidate";
        params?: import("zod").ZodObject<{
            body: import("zod").ZodObject<{
                id: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./invalidate_agent_key").InvalidateAgentKeyResponse>;
    createAgentKey: {
        endpoint: "POST /api/apm/agent_keys 2023-10-31";
        params?: import("zod").ZodObject<{
            body: import("zod").ZodObject<{
                name: import("zod").ZodString;
                privileges: import("zod").ZodArray<import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").PrivilegeType.EVENT>, import("zod").ZodLiteral<import("@kbn/apm-types").PrivilegeType.AGENT_CONFIG>]>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./create_agent_key").CreateAgentKeyResponse>;
};
export type { AgentKeysResponse } from './agent_keys';
export type { AgentKeysPrivilegesResponse } from './agent_keys_privileges';
export type { InvalidateAgentKeyResponse } from './invalidate_agent_key';
export type { CreateAgentKeyResponse } from './create_agent_key';
