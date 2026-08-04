import { z } from '@kbn/zod/v4';
export type ServiceDependenciesBreakdownResponse = Array<{
    title: string;
    data: Array<{
        x: number;
        y: number;
    }>;
}>;
export interface ServiceDependenciesBreakdownRouteResponse {
    breakdown: ServiceDependenciesBreakdownResponse;
}
export declare const serviceDependenciesBreakdownRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/dependencies/breakdown";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            kuery: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ServiceDependenciesBreakdownRouteResponse>;
