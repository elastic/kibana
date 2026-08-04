import { z } from '@kbn/zod/v4';
export interface InfrastructureAttributesResponse {
    containerIds: string[];
    hostNames: string[];
    podNames: string[];
}
export declare const infrastructureAttributesRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/infrastructure_attributes";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            agentName: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<InfrastructureAttributesResponse>;
