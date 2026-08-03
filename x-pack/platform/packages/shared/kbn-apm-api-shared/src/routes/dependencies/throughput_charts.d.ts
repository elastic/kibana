import { z } from '@kbn/zod/v4';
export interface ThroughputChartsForDependencyResponse {
    currentTimeseries: Array<{
        x: number;
        y: number | null;
    }>;
    comparisonTimeseries: Array<{
        x: number;
        y: number | null;
    }> | null;
}
export declare const dependencyThroughputChartsRoute: {
    endpoint: "GET /internal/apm/dependencies/charts/throughput";
    params?: z.ZodObject<{
        query: z.ZodObject<{
            dependencyName: z.ZodString;
            spanName: z.ZodString;
            searchServiceDestinationMetrics: z.ZodDefault<z.ZodUnion<readonly [z.ZodPipe<z.ZodEnum<{
                true: "true";
                false: "false";
            }>, z.ZodTransform<boolean, "true" | "false">>, z.ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            kuery: z.ZodString;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            offset: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ThroughputChartsForDependencyResponse>;
