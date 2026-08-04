import { z } from '@kbn/zod/v4';
export interface DependencyOperation {
    spanName: string;
    latency: number | null;
    throughput: number;
    failureRate: number | null;
    impact: number;
    timeseries: Record<'latency' | 'throughput' | 'failureRate', Array<{
        x: number;
        y: number | null;
    }>>;
}
export interface DependencyOperationsResponse {
    operations: DependencyOperation[];
}
export declare const dependencyOperationsRoute: {
    endpoint: "GET /internal/apm/dependencies/operations";
    params?: z.ZodObject<{
        query: z.ZodObject<{
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            offset: z.ZodOptional<z.ZodString>;
            dependencyName: z.ZodString;
            searchServiceDestinationMetrics: z.ZodDefault<z.ZodUnion<readonly [z.ZodPipe<z.ZodEnum<{
                true: "true";
                false: "false";
            }>, z.ZodTransform<boolean, "true" | "false">>, z.ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<DependencyOperationsResponse>;
