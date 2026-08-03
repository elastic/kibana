export declare const transactionsRouteDefinitions: {
    groupsMainStatistics: {
        endpoint: "GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                searchQuery: import("zod").ZodOptional<import("zod").ZodString>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                kuery: import("zod").ZodString;
                useDurationSummary: import("zod").ZodDefault<import("zod").ZodUnion<readonly [import("zod").ZodPipe<import("zod").ZodEnum<{
                    true: "true";
                    false: "false";
                }>, import("zod").ZodTransform<boolean, "true" | "false">>, import("zod").ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
                transactionType: import("zod").ZodString;
                latencyAggregationType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.avg>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.p95>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.p99>]>;
                documentType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionEvent>]>;
                rollupInterval: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.OneMinute>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.TenMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.SixtyMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.None>]>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./groups_main_statistics").MergedServiceTransactionGroupsResponse>;
    groupsDetailedStatistics: {
        endpoint: "GET /internal/apm/services/{serviceName}/transactions/groups/detailed_statistics";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                offset: import("zod").ZodOptional<import("zod").ZodString>;
                documentType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionEvent>]>;
                rollupInterval: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.OneMinute>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.TenMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.SixtyMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.None>]>;
                bucketSizeInSeconds: import("zod").ZodCoercedNumber<unknown>;
                useDurationSummary: import("zod").ZodDefault<import("zod").ZodUnion<readonly [import("zod").ZodPipe<import("zod").ZodEnum<{
                    true: "true";
                    false: "false";
                }>, import("zod").ZodTransform<boolean, "true" | "false">>, import("zod").ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
                transactionNames: import("zod").ZodPipe<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<any, string>>, import("zod").ZodArray<import("zod").ZodString>>;
                transactionType: import("zod").ZodString;
                latencyAggregationType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.avg>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.p95>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.p99>]>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./groups_detailed_statistics").ServiceTransactionGroupDetailedStatisticsResponse>;
    latencyCharts: {
        endpoint: "GET /internal/apm/services/{serviceName}/transactions/charts/latency";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                latencyAggregationType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.avg>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.p95>, import("zod").ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.p99>]>;
                bucketSizeInSeconds: import("zod").ZodCoercedNumber<unknown>;
                useDurationSummary: import("zod").ZodDefault<import("zod").ZodUnion<readonly [import("zod").ZodPipe<import("zod").ZodEnum<{
                    true: "true";
                    false: "false";
                }>, import("zod").ZodTransform<boolean, "true" | "false">>, import("zod").ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
                transactionType: import("zod").ZodOptional<import("zod").ZodString>;
                transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                filters: import("zod").ZodOptional<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<import("@kbn/es-query").BoolQuery, string>>>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                offset: import("zod").ZodOptional<import("zod").ZodString>;
                documentType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.ServiceTransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionEvent>]>;
                rollupInterval: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.OneMinute>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.TenMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.SixtyMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.None>]>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./latency_charts").TransactionLatencyResponse>;
    traceSamples: {
        endpoint: "GET /internal/apm/services/{serviceName}/transactions/traces/samples";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                transactionType: import("zod").ZodString;
                transactionName: import("zod").ZodString;
                transactionId: import("zod").ZodOptional<import("zod").ZodString>;
                traceId: import("zod").ZodOptional<import("zod").ZodString>;
                sampleRangeFrom: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                sampleRangeTo: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./trace_samples").TransactionTraceSamplesResponse>;
    chartsBreakdown: {
        endpoint: "GET /internal/apm/services/{serviceName}/transaction/charts/breakdown";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                transactionType: import("zod").ZodString;
                transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./breakdown").TransactionBreakdownResponse>;
    chartsErrorRate: {
        endpoint: "GET /internal/apm/services/{serviceName}/transactions/charts/error_rate";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                transactionType: import("zod").ZodString;
                bucketSizeInSeconds: import("zod").ZodCoercedNumber<unknown>;
                transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                filters: import("zod").ZodOptional<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<import("@kbn/es-query").BoolQuery, string>>>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                offset: import("zod").ZodOptional<import("zod").ZodString>;
                documentType: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.ServiceTransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionMetric>, import("zod").ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionEvent>]>;
                rollupInterval: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.OneMinute>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.TenMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.SixtyMinutes>, import("zod").ZodLiteral<import("@kbn/apm-types").RollupInterval.None>]>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./error_rate").FailedTransactionRateResponse>;
    chartsColdstartRate: {
        endpoint: "GET /internal/apm/services/{serviceName}/transactions/charts/coldstart_rate";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                transactionType: import("zod").ZodString;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                offset: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./coldstart_rate").ColdstartRateResponse>;
    chartsColdstartRateByTransactionName: {
        endpoint: "GET /internal/apm/services/{serviceName}/transactions/charts/coldstart_rate_by_transaction_name";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                transactionType: import("zod").ZodString;
                transactionName: import("zod").ZodString;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                offset: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./coldstart_rate").ColdstartRateResponse>;
};
export type { MergedServiceTransactionGroupsResponse } from './groups_main_statistics';
export type { ServiceTransactionGroupDetailedStatisticsResponse, ServiceTransactionGroupDetailedStat, } from './groups_detailed_statistics';
export type { TransactionLatencyResponse } from './latency_charts';
export type { TransactionTraceSamplesResponse } from './trace_samples';
export type { TransactionBreakdownResponse } from './breakdown';
export type { FailedTransactionRateResponse } from './error_rate';
export type { ColdstartRateResponse } from './coldstart_rate';
export type { ColdstartRateByTransactionNameResponse } from './coldstart_rate_by_transaction_name';
