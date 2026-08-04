import { z } from '@kbn/zod/v4';
import type { ConnectionStats, Node } from '@kbn/apm-types';
export interface TopDependenciesResponse {
    dependencies: Array<{
        currentStats: ConnectionStats & {
            impact: number;
        };
        previousStats: (ConnectionStats & {
            impact: number;
        }) | null;
        location: Node;
    }>;
    sampled: boolean;
}
export declare const topDependenciesRoute: {
    endpoint: "GET /internal/apm/dependencies/top_dependencies";
    params?: z.ZodObject<{
        query: z.ZodObject<{
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            numBuckets: z.ZodCoercedNumber<unknown>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<TopDependenciesResponse>;
