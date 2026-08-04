import { z } from '@kbn/zod/v4';
import type { Coordinate } from '@kbn/apm-types';
export interface ServiceInstancesDetailedStat {
    serviceNodeName: string;
    errorRate?: Coordinate[];
    latency?: Coordinate[];
    throughput?: Coordinate[];
    cpuUsage?: Coordinate[];
    memoryUsage?: Coordinate[];
}
export interface ServiceInstancesDetailedStatisticsResponse {
    currentPeriod: Record<string, ServiceInstancesDetailedStat>;
    previousPeriod: Record<string, ServiceInstancesDetailedStat>;
}
export declare const serviceInstancesDetailedStatisticsRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/service_overview_instances/detailed_statistics";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            latencyAggregationType: z.ZodUnion<readonly [z.ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.avg>, z.ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.p95>, z.ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.p99>]>;
            transactionType: z.ZodString;
            serviceNodeIds: z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodTransform<any, string>>, z.ZodArray<z.ZodString>>;
            numBuckets: z.ZodCoercedNumber<unknown>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            offset: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ServiceInstancesDetailedStatisticsResponse>;
