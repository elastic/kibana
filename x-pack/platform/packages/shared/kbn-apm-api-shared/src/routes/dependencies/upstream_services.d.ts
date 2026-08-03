import { z } from '@kbn/zod/v4';
import type { ConnectionStats, Node } from '@kbn/apm-types';
export interface UpstreamServicesForDependencyResponse {
    services: Array<{
        location: Node;
        currentStats: ConnectionStats & {
            impact: number;
        };
        previousStats: (ConnectionStats & {
            impact: number;
        }) | null;
    }>;
}
export declare const upstreamServicesRoute: {
    endpoint: "GET /internal/apm/dependencies/upstream_services";
    params?: z.ZodObject<{
        query: z.ZodObject<{
            dependencyName: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            numBuckets: z.ZodCoercedNumber<unknown>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            offset: z.ZodOptional<z.ZodString>;
            kuery: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<UpstreamServicesForDependencyResponse>;
