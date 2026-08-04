import { z } from '@kbn/zod/v4';
export type ServiceAlertsResponse = Array<{
    serviceName: string;
    alertsCount: number;
}>;
export type ServiceAlertsCountRouteResponse = ServiceAlertsResponse[number];
export declare const serviceAlertsCountRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/alerts_count";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<{
    serviceName: string;
    alertsCount: number;
}>;
