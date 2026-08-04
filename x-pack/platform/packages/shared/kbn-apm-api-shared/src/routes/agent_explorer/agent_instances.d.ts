import { z } from '@kbn/zod/v4';
export type AgentExplorerAgentInstancesResponse = Array<{
    serviceNode: string;
    environments: string[];
    agentVersion: string;
    lastReport: string;
}>;
export interface AgentExplorerAgentInstancesRouteResponse {
    items: AgentExplorerAgentInstancesResponse;
}
export declare const agentInstancesRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/agent_instances";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            probability: z.ZodCoercedNumber<unknown>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<AgentExplorerAgentInstancesRouteResponse>;
