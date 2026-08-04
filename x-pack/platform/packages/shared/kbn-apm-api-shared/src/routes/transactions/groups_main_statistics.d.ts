import { z } from '@kbn/zod/v4';
export interface MergedServiceTransactionGroupsResponse {
    transactionGroups: Array<{
        alertsCount: number;
        name: string;
        transactionType?: string;
        latency?: number | null;
        throughput?: number;
        errorRate?: number;
        impact?: number;
    }>;
    maxCountExceeded: boolean;
    transactionOverflowCount: number;
    hasActiveAlerts: boolean;
}
export declare const transactionGroupsMainStatisticsRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            searchQuery: z.ZodOptional<z.ZodString>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            kuery: z.ZodString;
            useDurationSummary: z.ZodDefault<z.ZodUnion<readonly [z.ZodPipe<z.ZodEnum<{
                true: "true";
                false: "false";
            }>, z.ZodTransform<boolean, "true" | "false">>, z.ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
            transactionType: z.ZodString;
            latencyAggregationType: z.ZodUnion<readonly [z.ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.avg>, z.ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.p95>, z.ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.p99>]>;
            documentType: z.ZodUnion<readonly [z.ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionMetric>, z.ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionEvent>]>;
            rollupInterval: z.ZodUnion<readonly [z.ZodLiteral<import("@kbn/apm-types").RollupInterval.OneMinute>, z.ZodLiteral<import("@kbn/apm-types").RollupInterval.TenMinutes>, z.ZodLiteral<import("@kbn/apm-types").RollupInterval.SixtyMinutes>, z.ZodLiteral<import("@kbn/apm-types").RollupInterval.None>]>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<MergedServiceTransactionGroupsResponse>;
