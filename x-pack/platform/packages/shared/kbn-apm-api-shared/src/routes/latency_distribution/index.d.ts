export declare const latencyDistributionRouteDefinitions: {
    overallTransactionDistribution: {
        endpoint: "POST /internal/apm/latency/overall_distribution/transactions";
        params?: import("zod").ZodObject<{
            body: import("zod").ZodObject<{
                serviceName: import("zod").ZodOptional<import("zod").ZodString>;
                transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                transactionType: import("zod").ZodOptional<import("zod").ZodString>;
                termFilters: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
                    fieldName: import("zod").ZodString;
                    fieldValue: import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodNumber]>;
                }, import("zod/v4/core").$strip>>>;
                durationMin: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                durationMax: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                percentileThreshold: import("zod").ZodCoercedNumber<unknown>;
                chartType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").LatencyDistributionChartType.transactionLatency>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyDistributionChartType.spanLatency>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyDistributionChartType.latencyCorrelations>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyDistributionChartType.failedTransactionsCorrelations>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyDistributionChartType.dependencyLatency>]>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("@kbn/apm-types").OverallLatencyDistributionResponse>;
    overallSpanDistribution: {
        endpoint: "POST /internal/apm/latency/overall_distribution/spans";
        params?: import("zod").ZodObject<{
            body: import("zod").ZodObject<{
                serviceName: import("zod").ZodOptional<import("zod").ZodString>;
                spanName: import("zod").ZodOptional<import("zod").ZodString>;
                transactionId: import("zod").ZodOptional<import("zod").ZodString>;
                termFilters: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
                    fieldName: import("zod").ZodString;
                    fieldValue: import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodNumber]>;
                }, import("zod/v4/core").$strip>>>;
                durationMin: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                durationMax: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                isOtel: import("zod").ZodOptional<import("zod").ZodBoolean>;
                percentileThreshold: import("zod").ZodCoercedNumber<unknown>;
                chartType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").LatencyDistributionChartType.transactionLatency>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyDistributionChartType.spanLatency>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyDistributionChartType.latencyCorrelations>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyDistributionChartType.failedTransactionsCorrelations>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyDistributionChartType.dependencyLatency>]>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("@kbn/apm-types").OverallLatencyDistributionResponse>;
};
export type { LatencyOverallTransactionDistributionResponse } from './overall_transaction_distribution';
export type { LatencyOverallSpanDistributionResponse } from './overall_span_distribution';
