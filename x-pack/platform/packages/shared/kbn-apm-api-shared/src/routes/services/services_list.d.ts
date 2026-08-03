import { z } from '@kbn/zod/v4';
import type { AgentName } from '@kbn/elastic-agent-utils';
import type { AnomalyDetectorType, Environment, SloStatus } from '@kbn/apm-types';
export interface MergedServiceStat {
    serviceName: string;
    transactionType?: string;
    environments?: string[];
    agentName?: AgentName;
    latency?: number | null;
    transactionErrorRate?: number;
    throughput?: number;
    anomalyScore?: number;
    detectorType?: AnomalyDetectorType;
    anomalyEnvironment?: Environment;
    alertsCount?: number;
    sloStatus?: SloStatus;
    sloCount?: number;
}
export interface ServicesItemsResponse {
    items: MergedServiceStat[];
    maxCountExceeded: boolean;
    serviceOverflowCount: number;
}
export declare const servicesListRoute: {
    endpoint: "GET /internal/apm/services";
    params?: z.ZodObject<{
        query: z.ZodObject<{
            searchQuery: z.ZodOptional<z.ZodString>;
            serviceGroup: z.ZodOptional<z.ZodString>;
            probability: z.ZodCoercedNumber<unknown>;
            documentType: z.ZodUnion<readonly [z.ZodLiteral<import("@kbn/apm-types").ApmDocumentType.ServiceTransactionMetric>, z.ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionMetric>, z.ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionEvent>]>;
            rollupInterval: z.ZodUnion<readonly [z.ZodLiteral<import("@kbn/apm-types").RollupInterval.OneMinute>, z.ZodLiteral<import("@kbn/apm-types").RollupInterval.TenMinutes>, z.ZodLiteral<import("@kbn/apm-types").RollupInterval.SixtyMinutes>, z.ZodLiteral<import("@kbn/apm-types").RollupInterval.None>]>;
            useDurationSummary: z.ZodDefault<z.ZodUnion<readonly [z.ZodPipe<z.ZodEnum<{
                true: "true";
                false: "false";
            }>, z.ZodTransform<boolean, "true" | "false">>, z.ZodBoolean]> & import("@kbn/zod-helpers/v4/kbn_zod_types/kbn_zod_type").KbnZodType>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ServicesItemsResponse>;
