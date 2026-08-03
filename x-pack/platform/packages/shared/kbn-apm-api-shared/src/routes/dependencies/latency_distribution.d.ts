import { z } from '@kbn/zod/v4';
import type { OverallLatencyDistributionResponse } from '@kbn/apm-types';
export interface DependencyLatencyDistributionResponse {
    allSpansDistribution: OverallLatencyDistributionResponse;
    failedSpansDistribution: OverallLatencyDistributionResponse;
}
export declare const dependencyLatencyDistributionRoute: {
    endpoint: "GET /internal/apm/dependencies/charts/distribution";
    params?: z.ZodObject<{
        query: z.ZodObject<{
            dependencyName: z.ZodString;
            spanName: z.ZodString;
            percentileThreshold: z.ZodCoercedNumber<unknown>;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            kuery: z.ZodString;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<DependencyLatencyDistributionResponse>;
