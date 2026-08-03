import { z } from '@kbn/zod/v4';
import type { NodeStats } from '@kbn/apm-types';
export interface ServiceMapServiceDependencyInfoResponse {
    currentPeriod: NodeStats;
    previousPeriod: NodeStats | undefined;
}
export declare const serviceMapDependencyNodeRoute: {
    endpoint: "GET /internal/apm/service-map/dependency";
    params?: z.ZodObject<{
        query: z.ZodObject<{
            dependencies: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>;
            sourceServiceName: z.ZodOptional<z.ZodString>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            offset: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ServiceMapServiceDependencyInfoResponse>;
