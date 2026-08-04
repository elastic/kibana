import { z } from '@kbn/zod/v4';
export interface AgentConfigurationAgentNameResponse {
    agentName: string | undefined;
}
export declare const agentConfigurationAgentNameRoute: {
    endpoint: "GET /api/apm/settings/agent-configuration/agent_name 2023-10-31";
    params?: z.ZodObject<{
        query: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<AgentConfigurationAgentNameResponse>;
