import { z } from '@kbn/zod/v4';
export interface DeleteAgentConfigurationResponse {
    result: string;
}
export declare const deleteAgentConfigurationRoute: {
    endpoint: "DELETE /api/apm/settings/agent-configuration 2023-10-31";
    params?: z.ZodObject<{
        body: z.ZodObject<{
            service: z.ZodObject<{
                name: z.ZodOptional<z.ZodString>;
                environment: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<DeleteAgentConfigurationResponse>;
