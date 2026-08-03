import { z } from '@kbn/zod/v4';
import type { AgentConfiguration } from '@kbn/apm-common';
export type GetSingleAgentConfigurationResponse = AgentConfiguration;
export declare const getSingleAgentConfigurationRoute: {
    endpoint: "GET /api/apm/settings/agent-configuration/view 2023-10-31";
    params?: z.ZodObject<{
        query: z.ZodOptional<z.ZodObject<{
            name: z.ZodOptional<z.ZodString>;
            environment: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<AgentConfiguration>;
