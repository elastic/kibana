import { z } from '@kbn/zod/v4';
export type ServiceInstanceMainStatisticsResponse = Array<{
    serviceNodeName: string;
    errorRate?: number;
    latency?: number;
    throughput?: number;
    cpuUsage?: number | null;
    memoryUsage?: number | null;
}>;
export interface ServiceInstancesMainStatisticsRouteResponse {
    currentPeriod: ServiceInstanceMainStatisticsResponse;
    previousPeriod: ServiceInstanceMainStatisticsResponse;
}
export declare const serviceInstancesMainStatisticsRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            latencyAggregationType: z.ZodUnion<readonly [z.ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.avg>, z.ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.p95>, z.ZodLiteral<import("@kbn/apm-types").LatencyAggregationType.p99>]>;
            transactionType: z.ZodString;
            sortField: z.ZodEnum<{
                latency: "latency";
                serviceNodeName: "serviceNodeName";
                throughput: "throughput";
                errorRate: "errorRate";
                cpuUsage: "cpuUsage";
                memoryUsage: "memoryUsage";
            }>;
            sortDirection: z.ZodUnion<readonly [z.ZodLiteral<"asc">, z.ZodLiteral<"desc">]>;
            offset: z.ZodOptional<z.ZodString>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ServiceInstancesMainStatisticsRouteResponse>;
