import { z } from '@kbn/zod/v4';
import type { ConnectionStatsItemWithImpact } from '@kbn/apm-types';
export type ServiceDependenciesResponse = Array<Omit<ConnectionStatsItemWithImpact, 'stats'> & {
    currentStats: ConnectionStatsItemWithImpact['stats'];
    previousStats: ConnectionStatsItemWithImpact['stats'] | null;
}>;
export interface ServiceDependenciesRouteResponse {
    serviceDependencies: ServiceDependenciesResponse;
}
export declare const serviceDependenciesRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/dependencies";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            numBuckets: z.ZodCoercedNumber<unknown>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            offset: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ServiceDependenciesRouteResponse>;
