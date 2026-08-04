export declare const alertsRouteDefinitions: {
    transactionErrorRateChartPreview: {
        endpoint: "GET /internal/apm/rule_types/transaction_error_rate/chart_preview";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                aggregationType: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").AggregationType.Avg>, import("zod").ZodLiteral<import("@kbn/apm-types").AggregationType.P95>, import("zod").ZodLiteral<import("@kbn/apm-types").AggregationType.P99>]>>;
                serviceName: import("zod").ZodOptional<import("zod").ZodString>;
                errorGroupingKey: import("zod").ZodOptional<import("zod").ZodString>;
                transactionType: import("zod").ZodOptional<import("zod").ZodString>;
                transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                interval: import("zod").ZodString;
                groupBy: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
                searchConfiguration: import("zod").ZodOptional<import("zod").ZodPipe<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<any, string>>, import("zod").ZodObject<{
                    query: import("zod").ZodObject<{
                        query: import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodAny>]>;
                        language: import("zod").ZodString;
                    }, import("zod/v4/core").$strip>;
                }, import("zod/v4/core").$strip>>>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./transaction_error_rate_chart_preview").TransactionErrorRateChartPreviewResponse>;
    errorCountChartPreview: {
        endpoint: "GET /internal/apm/rule_types/error_count/chart_preview";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                aggregationType: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").AggregationType.Avg>, import("zod").ZodLiteral<import("@kbn/apm-types").AggregationType.P95>, import("zod").ZodLiteral<import("@kbn/apm-types").AggregationType.P99>]>>;
                serviceName: import("zod").ZodOptional<import("zod").ZodString>;
                errorGroupingKey: import("zod").ZodOptional<import("zod").ZodString>;
                transactionType: import("zod").ZodOptional<import("zod").ZodString>;
                transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                interval: import("zod").ZodString;
                groupBy: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
                searchConfiguration: import("zod").ZodOptional<import("zod").ZodPipe<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<any, string>>, import("zod").ZodObject<{
                    query: import("zod").ZodObject<{
                        query: import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodAny>]>;
                        language: import("zod").ZodString;
                    }, import("zod/v4/core").$strip>;
                }, import("zod/v4/core").$strip>>>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./error_count_chart_preview").ErrorCountChartPreviewResponse>;
    transactionDurationChartPreview: {
        endpoint: "GET /internal/apm/rule_types/transaction_duration/chart_preview";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                aggregationType: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodLiteral<import("@kbn/apm-types").AggregationType.Avg>, import("zod").ZodLiteral<import("@kbn/apm-types").AggregationType.P95>, import("zod").ZodLiteral<import("@kbn/apm-types").AggregationType.P99>]>>;
                serviceName: import("zod").ZodOptional<import("zod").ZodString>;
                errorGroupingKey: import("zod").ZodOptional<import("zod").ZodString>;
                transactionType: import("zod").ZodOptional<import("zod").ZodString>;
                transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                interval: import("zod").ZodString;
                groupBy: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
                searchConfiguration: import("zod").ZodOptional<import("zod").ZodPipe<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<any, string>>, import("zod").ZodObject<{
                    query: import("zod").ZodObject<{
                        query: import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodAny>]>;
                        language: import("zod").ZodString;
                    }, import("zod/v4/core").$strip>;
                }, import("zod/v4/core").$strip>>>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./transaction_duration_chart_preview").TransactionDurationChartPreviewResponse>;
};
export type { AlertParams, PreviewChartResponse, PreviewChartResponseItem } from './types';
export type { TransactionErrorRateChartPreviewResponse } from './transaction_error_rate_chart_preview';
export type { ErrorCountChartPreviewResponse } from './error_count_chart_preview';
export type { TransactionDurationChartPreviewResponse } from './transaction_duration_chart_preview';
