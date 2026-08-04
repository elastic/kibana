export declare const tracesRouteDefinitions: {
    unifiedTracesById: {
        endpoint: "GET /internal/apm/unified_traces/{traceId}";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                traceId: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                serviceName: import("zod").ZodOptional<import("zod").ZodString>;
                entryTransactionId: import("zod").ZodOptional<import("zod").ZodString>;
                ecsOnly: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodPipe<import("zod").ZodEnum<{
                    true: "true";
                    false: "false";
                }>, import("zod").ZodTransform<boolean, "true" | "false">>, import("zod").ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./unified_traces_by_id").UnifiedTracesByIdResponse>;
    unifiedTracesByIdSummary: {
        endpoint: "GET /internal/apm/unified_traces/{traceId}/summary";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                traceId: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                maxTraceItems: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                docId: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./unified_traces_by_id_summary").UnifiedTracesByIdSummaryResponse>;
    unifiedTracesByIdErrors: {
        endpoint: "GET /internal/apm/unified_traces/{traceId}/errors";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                traceId: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                docId: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("@kbn/apm-types").ErrorsByTraceId>;
    unifiedTracesRootSpan: {
        endpoint: "GET /internal/apm/unified_traces/{traceId}/root_span";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                traceId: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("@kbn/apm-types").TraceRootSpan>;
    rootTransactionByTraceId: {
        endpoint: "GET /internal/apm/traces/{traceId}/root_transaction";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                traceId: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./root_transaction_by_trace_id").RootTransactionByTraceIdResponse>;
    transactionByName: {
        endpoint: "GET /internal/apm/transactions";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                transactionName: import("zod").ZodString;
                serviceName: import("zod").ZodString;
                environment: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./transaction_by_name").TransactionByNameResponse>;
    transactionById: {
        endpoint: "GET /internal/apm/transactions/{transactionId}";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                transactionId: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./transaction_by_id").TransactionByIdResponse>;
    transactionFromTraceById: {
        endpoint: "GET /internal/apm/traces/{traceId}/transactions/{transactionId}";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                traceId: import("zod").ZodString;
                transactionId: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("@kbn/apm-types").Transaction>;
    spanFromTraceById: {
        endpoint: "GET /internal/apm/traces/{traceId}/spans/{spanId}";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                traceId: import("zod").ZodString;
                spanId: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                parentTransactionId: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./span_from_trace_by_id").SpanFromTraceByIdResponse>;
    unifiedTraceSpan: {
        endpoint: "GET /internal/apm/unified_traces/{traceId}/spans/{spanId}";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                traceId: import("zod").ZodString;
                spanId: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("@kbn/apm-types").UnifiedSpanDocument>;
    traces: {
        endpoint: "GET /internal/apm/traces";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                probability: import("zod").ZodCoercedNumber<unknown>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./traces").TopTracesPrimaryStatsResponse>;
};
export type { UnifiedTracesByIdResponse } from './unified_traces_by_id';
export type { UnifiedTracesByIdSummaryResponse } from './unified_traces_by_id_summary';
export type { UnifiedTracesRootSpanResponse } from './unified_traces_root_span';
export type { RootTransactionByTraceIdResponse } from './root_transaction_by_trace_id';
export type { TransactionByNameResponse } from './transaction_by_name';
export type { TransactionByIdResponse } from './transaction_by_id';
export type { TransactionFromTraceByIdResponse } from './transaction_from_trace_by_id';
export type { SpanFromTraceByIdResponse } from './span_from_trace_by_id';
export type { UnifiedTraceSpanResponse } from './unified_trace_span';
export type { TopTracesPrimaryStatsResponse, BucketKey } from './traces';
