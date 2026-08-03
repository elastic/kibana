export declare const fleetRouteDefinitions: {
    hasApmPolicies: {
        endpoint: "GET /internal/apm/fleet/has_apm_policies";
        params?: undefined;
    } & import("../types").WithResponse<import("./has_apm_policies").HasApmPoliciesResponse>;
    agents: {
        endpoint: "GET /internal/apm/fleet/agents";
        params?: undefined;
    } & import("../types").WithResponse<import("./fleet_agents").FleetAgentResponse>;
    saveSchema: {
        endpoint: "POST /api/apm/fleet/apm_server_schema 2023-10-31";
        params?: import("zod").ZodObject<{
            body: import("zod").ZodObject<{
                schema: import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodUnknown>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<void>;
    unsupportedSchema: {
        endpoint: "GET /internal/apm/fleet/apm_server_schema/unsupported";
        params?: undefined;
    } & import("../types").WithResponse<import("./unsupported_apm_server_schema").UnsupportedApmServerSchemaResponse>;
    javaAgentVersions: {
        endpoint: "GET /internal/apm/fleet/java_agent_versions";
        params?: undefined;
    } & import("../types").WithResponse<import("./java_agent_versions").JavaAgentVersionsResponse>;
};
export type { HasApmPoliciesResponse } from './has_apm_policies';
export type { FleetAgentResponse } from './fleet_agents';
export type { UnsupportedApmServerSchema, UnsupportedApmServerSchemaResponse, } from './unsupported_apm_server_schema';
export type { JavaAgentVersionsResponse } from './java_agent_versions';
