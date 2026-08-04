import { z } from '@kbn/zod/v4';
import type { Coordinate } from '@kbn/apm-types';
export interface ServiceTransactionDetailedStat {
    serviceName: string;
    latency: Coordinate[];
    transactionErrorRate?: Coordinate[];
    throughput?: Coordinate[];
}
export interface ServiceTransactionDetailedStatPeriodsResponse {
    currentPeriod: Record<string, ServiceTransactionDetailedStat>;
    previousPeriod: Record<string, ServiceTransactionDetailedStat>;
}
export declare const servicesDetailedStatisticsRoute: {
    endpoint: "POST /internal/apm/services/detailed_statistics";
    params?: z.ZodObject<{
        query: z.ZodObject<{
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            offset: z.ZodOptional<z.ZodString>;
            probability: z.ZodCoercedNumber<unknown>;
            documentType: z.ZodUnion<readonly [z.ZodLiteral<import("@kbn/apm-types").ApmDocumentType.ServiceTransactionMetric>, z.ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionMetric>, z.ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionEvent>]>;
            rollupInterval: z.ZodUnion<readonly [z.ZodLiteral<import("@kbn/apm-types").RollupInterval.OneMinute>, z.ZodLiteral<import("@kbn/apm-types").RollupInterval.TenMinutes>, z.ZodLiteral<import("@kbn/apm-types").RollupInterval.SixtyMinutes>, z.ZodLiteral<import("@kbn/apm-types").RollupInterval.None>]>;
            bucketSizeInSeconds: z.ZodCoercedNumber<unknown>;
        }, z.core.$strip>;
        body: z.ZodObject<{
            serviceNames: z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodTransform<any, string>>, z.ZodArray<z.ZodString>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ServiceTransactionDetailedStatPeriodsResponse>;
