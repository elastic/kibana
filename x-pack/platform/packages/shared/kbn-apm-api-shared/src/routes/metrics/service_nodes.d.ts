import { z } from '@kbn/zod/v4';
export type ServiceNodesResponse = Array<{
    name: string;
    cpu: number | null;
    heapMemory: number | null;
    hostName: string | null | undefined;
    nonHeapMemory: number | null;
    threadCount: number | null;
}>;
export interface ServiceMetricsNodesRouteResponse {
    serviceNodes: ServiceNodesResponse;
}
export declare const serviceMetricsNodesRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/metrics/nodes";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ServiceMetricsNodesRouteResponse>;
