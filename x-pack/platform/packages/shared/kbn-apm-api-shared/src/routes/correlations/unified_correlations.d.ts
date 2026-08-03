import { z } from '@kbn/zod/v4';
import { type CorrelationsResponse } from '@kbn/apm-types';
export type UnifiedCorrelationsRouteResponse = CorrelationsResponse;
export declare const unifiedCorrelationsRoute: {
    endpoint: "POST /internal/apm/correlations";
    params?: z.ZodObject<{
        body: z.ZodObject<{
            entityType: z.ZodEnum<{
                transaction: "transaction";
                exit_span: "exit_span";
            }>;
            metric: z.ZodEnum<{
                latency: "latency";
                failure_rate: "failure_rate";
                throughput: "throughput";
                infra_metrics: "infra_metrics";
            }>;
            serviceName: z.ZodOptional<z.ZodString>;
            transactionName: z.ZodOptional<z.ZodString>;
            transactionType: z.ZodOptional<z.ZodString>;
            fieldCandidates: z.ZodOptional<z.ZodArray<z.ZodString>>;
            durationMin: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
            durationMax: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
            percentileThreshold: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
            includeHistogram: z.ZodOptional<z.ZodUnion<readonly [z.ZodPipe<z.ZodEnum<{
                true: "true";
                false: "false";
            }>, z.ZodTransform<boolean, "true" | "false">>, z.ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
            kuery: z.ZodOptional<z.ZodString>;
            environment: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>>;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<CorrelationsResponse>;
