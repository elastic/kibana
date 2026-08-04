import { z } from '@kbn/zod/v4';
import type { OverallLatencyDistributionResponse } from '@kbn/apm-types';
export type LatencyOverallTransactionDistributionResponse = OverallLatencyDistributionResponse;
export declare const latencyOverallTransactionDistributionRoute: {
    endpoint: "POST /internal/apm/latency/overall_distribution/transactions";
    params?: z.ZodObject<{
        body: z.ZodObject<{
            serviceName: z.ZodOptional<z.ZodString>;
            transactionName: z.ZodOptional<z.ZodString>;
            transactionType: z.ZodOptional<z.ZodString>;
            termFilters: z.ZodOptional<z.ZodArray<z.ZodObject<{
                fieldName: z.ZodString;
                fieldValue: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
            }, z.core.$strip>>>;
            durationMin: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
            durationMax: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
            percentileThreshold: z.ZodCoercedNumber<unknown>;
            chartType: z.ZodUnion<readonly [z.ZodLiteral<import("@kbn/apm-types").LatencyDistributionChartType.transactionLatency>, z.ZodLiteral<import("@kbn/apm-types").LatencyDistributionChartType.spanLatency>, z.ZodLiteral<import("@kbn/apm-types").LatencyDistributionChartType.latencyCorrelations>, z.ZodLiteral<import("@kbn/apm-types").LatencyDistributionChartType.failedTransactionsCorrelations>, z.ZodLiteral<import("@kbn/apm-types").LatencyDistributionChartType.dependencyLatency>]>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<OverallLatencyDistributionResponse>;
