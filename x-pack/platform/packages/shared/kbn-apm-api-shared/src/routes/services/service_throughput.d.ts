import { z } from '@kbn/zod/v4';
import type { Coordinate } from '@kbn/apm-types';
export type ServiceThroughputResponse = Coordinate[];
export interface ServiceThroughputRouteResponse {
    currentPeriod: ServiceThroughputResponse;
    previousPeriod: ServiceThroughputResponse;
}
export declare const serviceThroughputRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/throughput";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            bucketSizeInSeconds: z.ZodCoercedNumber<unknown>;
            transactionType: z.ZodOptional<z.ZodString>;
            transactionName: z.ZodOptional<z.ZodString>;
            filters: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<import("@kbn/es-query").BoolQuery, string>>>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            offset: z.ZodOptional<z.ZodString>;
            documentType: z.ZodUnion<readonly [z.ZodLiteral<import("@kbn/apm-types").ApmDocumentType.ServiceTransactionMetric>, z.ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionMetric>, z.ZodLiteral<import("@kbn/apm-types").ApmDocumentType.TransactionEvent>]>;
            rollupInterval: z.ZodUnion<readonly [z.ZodLiteral<import("@kbn/apm-types").RollupInterval.OneMinute>, z.ZodLiteral<import("@kbn/apm-types").RollupInterval.TenMinutes>, z.ZodLiteral<import("@kbn/apm-types").RollupInterval.SixtyMinutes>, z.ZodLiteral<import("@kbn/apm-types").RollupInterval.None>]>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ServiceThroughputRouteResponse>;
