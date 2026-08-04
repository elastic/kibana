import { z } from '@kbn/zod/v4';
import type { ServiceMapResponse } from '@kbn/apm-types';
export type ServiceMapRouteResponse = ServiceMapResponse;
export declare const serviceMapRoute: {
    endpoint: "GET /internal/apm/service-map";
    params?: z.ZodObject<{
        query: z.ZodObject<{
            serviceName: z.ZodOptional<z.ZodString>;
            serviceGroup: z.ZodOptional<z.ZodString>;
            kuery: z.ZodOptional<z.ZodString>;
            esQuery: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<any, string>>>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ServiceMapResponse>;
