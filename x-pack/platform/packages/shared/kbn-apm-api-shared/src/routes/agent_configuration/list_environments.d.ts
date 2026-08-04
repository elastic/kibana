import { z } from '@kbn/zod/v4';
export type AgentConfigurationEnvironmentsResponse = Array<{
    name: string;
    alreadyConfigured: boolean;
}>;
export interface ListAgentConfigurationEnvironmentsResponse {
    environments: AgentConfigurationEnvironmentsResponse;
}
export declare const listAgentConfigurationEnvironmentsRoute: {
    endpoint: "GET /api/apm/settings/agent-configuration/environments 2023-10-31";
    params?: z.ZodObject<{
        query: z.ZodOptional<z.ZodObject<{
            serviceName: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ListAgentConfigurationEnvironmentsResponse>;
