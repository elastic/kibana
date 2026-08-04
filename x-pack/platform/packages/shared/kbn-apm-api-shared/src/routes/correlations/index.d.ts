export declare const correlationsRouteDefinitions: {
    fieldCandidatesTransactions: {
        endpoint: "GET /internal/apm/correlations/field_candidates/transactions";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                serviceName: import("zod").ZodOptional<import("zod").ZodString>;
                transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                transactionType: import("zod").ZodOptional<import("zod").ZodString>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./field_candidates_transactions").DurationFieldCandidatesResponse>;
    fieldValueStatsTransactions: {
        endpoint: "GET /internal/apm/correlations/field_value_stats/transactions";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                serviceName: import("zod").ZodOptional<import("zod").ZodString>;
                transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                transactionType: import("zod").ZodOptional<import("zod").ZodString>;
                samplerShardSize: import("zod").ZodOptional<import("zod").ZodString>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                fieldName: import("zod").ZodString;
                fieldValue: import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodNumber]>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("@kbn/apm-types").TopValuesStats>;
    fieldValuePairsTransactions: {
        endpoint: "POST /internal/apm/correlations/field_value_pairs/transactions";
        params?: import("zod").ZodObject<{
            body: import("zod").ZodObject<{
                serviceName: import("zod").ZodOptional<import("zod").ZodString>;
                transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                transactionType: import("zod").ZodOptional<import("zod").ZodString>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                fieldCandidates: import("zod").ZodArray<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./field_value_pairs_transactions").FieldValuePairsResponse>;
    significantCorrelationsTransactions: {
        endpoint: "POST /internal/apm/correlations/significant_correlations/transactions";
        params?: import("zod").ZodObject<{
            body: import("zod").ZodObject<{
                serviceName: import("zod").ZodOptional<import("zod").ZodString>;
                transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                transactionType: import("zod").ZodOptional<import("zod").ZodString>;
                durationMin: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                durationMax: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                fieldValuePairs: import("zod").ZodArray<import("zod").ZodObject<{
                    fieldName: import("zod").ZodString;
                    fieldValue: import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodCoercedNumber<unknown>]>;
                }, import("zod/v4/core").$strip>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./significant_correlations_transactions").SignificantCorrelationsResponse>;
    pValuesTransactions: {
        endpoint: "POST /internal/apm/correlations/p_values/transactions";
        params?: import("zod").ZodObject<{
            body: import("zod").ZodObject<{
                serviceName: import("zod").ZodOptional<import("zod").ZodString>;
                transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                transactionType: import("zod").ZodOptional<import("zod").ZodString>;
                durationMin: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                durationMax: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                kuery: import("zod").ZodString;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                fieldCandidates: import("zod").ZodArray<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./p_values_transactions").PValuesResponse>;
    unifiedCorrelations: {
        endpoint: "POST /internal/apm/correlations";
        params?: import("zod").ZodObject<{
            body: import("zod").ZodObject<{
                entityType: import("zod").ZodEnum<{
                    transaction: "transaction";
                    exit_span: "exit_span";
                }>;
                metric: import("zod").ZodEnum<{
                    latency: "latency";
                    failure_rate: "failure_rate";
                    throughput: "throughput";
                    infra_metrics: "infra_metrics";
                }>;
                serviceName: import("zod").ZodOptional<import("zod").ZodString>;
                transactionName: import("zod").ZodOptional<import("zod").ZodString>;
                transactionType: import("zod").ZodOptional<import("zod").ZodString>;
                fieldCandidates: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
                durationMin: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                durationMax: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                percentileThreshold: import("zod").ZodOptional<import("zod").ZodCoercedNumber<unknown>>;
                includeHistogram: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodPipe<import("zod").ZodEnum<{
                    true: "true";
                    false: "false";
                }>, import("zod").ZodTransform<boolean, "true" | "false">>, import("zod").ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
                kuery: import("zod").ZodOptional<import("zod").ZodString>;
                environment: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>>;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("@kbn/apm-types").CorrelationsResponse>;
};
export type { DurationFieldCandidatesResponse } from './field_candidates_transactions';
export type { FieldValueStatsTransactionsResponse } from './field_value_stats_transactions';
export type { FieldValuePairsResponse } from './field_value_pairs_transactions';
export type { SignificantCorrelationsResponse } from './significant_correlations_transactions';
export type { PValuesResponse } from './p_values_transactions';
export type { UnifiedCorrelationsRouteResponse } from './unified_correlations';
