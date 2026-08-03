export declare const agentExplorerRouteDefinitions: {
    agentsPerService: {
        endpoint: "GET /internal/apm/get_agents_per_service";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                probability: import("zod").ZodCoercedNumber<unknown>;
                serviceName: import("zod").ZodOptional<import("zod").ZodString>;
                agentLanguage: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./agents_per_service").AgentExplorerAgentsResponse>;
    latestAgentVersions: {
        endpoint: "GET /internal/apm/get_latest_agent_versions";
        params?: undefined;
    } & import("../types").WithResponse<import("./latest_agent_versions").AgentLatestVersionsResponse>;
    agentInstances: {
        endpoint: "GET /internal/apm/services/{serviceName}/agent_instances";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                probability: import("zod").ZodCoercedNumber<unknown>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./agent_instances").AgentExplorerAgentInstancesRouteResponse>;
};
export type { AgentExplorerAgentsResponse } from './agents_per_service';
export type { AgentLatestVersionsResponse } from './latest_agent_versions';
export type { AgentExplorerAgentInstancesResponse, AgentExplorerAgentInstancesRouteResponse, } from './agent_instances';
