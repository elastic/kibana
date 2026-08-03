import { z } from '@kbn/zod/v4';
import { type Coordinate } from '@kbn/apm-types';
export interface ServiceTransactionGroupDetailedStat {
    transactionName: string;
    latency: Coordinate[];
    throughput: Coordinate[];
    errorRate: Coordinate[];
    impact: number;
}
export interface ServiceTransactionGroupDetailedStatisticsResponse {
    currentPeriod: Record<string, ServiceTransactionGroupDetailedStat>;
    previousPeriod: Record<string, ServiceTransactionGroupDetailedStat>;
}
export declare const transactionGroupsDetailedStatisticsRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/transactions/groups/detailed_statistics";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            offset: z.ZodOptional<z.ZodString>;
            documentType: z.ZodUnion<readonly [z.ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionMetric>, z.ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionEvent>]>;
            rollupInterval: z.ZodUnion<readonly [z.ZodLiteral<import("@kbn/apm-types").RollupInterval.OneMinute>, z.ZodLiteral<import("@kbn/apm-types").RollupInterval.TenMinutes>, z.ZodLiteral<import("@kbn/apm-types").RollupInterval.SixtyMinutes>, z.ZodLiteral<import("@kbn/apm-types").RollupInterval.None>]>;
            bucketSizeInSeconds: z.ZodCoercedNumber<unknown>;
            useDurationSummary: z.ZodDefault<z.ZodUnion<readonly [z.ZodPipe<z.ZodEnum<{
                true: "true";
                false: "false";
            }>, z.ZodTransform<boolean, "true" | "false">>, z.ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
            transactionNames: z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodTransform<any, string>>, z.ZodArray<z.ZodString>>;
            transactionType: z.ZodString;
            latencyAggregationType: z.ZodUnion<readonly [z.ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.avg>, z.ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.p95>, z.ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.p99>]>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ServiceTransactionGroupDetailedStatisticsResponse>;
