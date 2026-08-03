import { z } from '@kbn/zod/v4';
interface Statistics {
    latency: Array<{
        x: number;
        y: number;
    }>;
    errorRate: Array<{
        x: number;
        y: number;
    }>;
    throughput: Array<{
        x: number;
        y: number | null;
    }>;
}
export interface DependenciesTimeseriesStatisticsResponse {
    currentTimeseries: Record<string, Statistics>;
    comparisonTimeseries: Record<string, Statistics> | null;
}
export declare const topDependenciesStatisticsRoute: {
    endpoint: "POST /internal/apm/dependencies/top_dependencies/statistics";
    params?: z.ZodObject<{
        query: z.ZodObject<{
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            offset: z.ZodOptional<z.ZodString>;
            numBuckets: z.ZodCoercedNumber<unknown>;
        }, z.core.$strip>;
        body: z.ZodObject<{
            dependencyNames: z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodTransform<any, string>>, z.ZodArray<z.ZodString>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<DependenciesTimeseriesStatisticsResponse>;
export {};
