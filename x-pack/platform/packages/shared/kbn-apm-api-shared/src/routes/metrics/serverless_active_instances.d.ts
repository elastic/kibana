import { z } from '@kbn/zod/v4';
import type { Coordinate } from '@kbn/apm-types';
export interface ActiveInstanceTimeseries {
    serverlessDuration: Coordinate[];
    billedDuration: Coordinate[];
}
export interface ActiveInstanceOverview {
    activeInstanceName: string;
    serverlessId: string;
    serverlessFunctionName: string;
    timeseries: ActiveInstanceTimeseries;
    serverlessDurationAvg: number | null;
    billedDurationAvg: number | null;
    avgMemoryUsed?: number | null;
    memorySize: number | null;
}
export interface ServerlessActiveInstancesResponse {
    activeInstances: ActiveInstanceOverview[];
    timeseries: Coordinate[];
}
export declare const serverlessActiveInstancesRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/metrics/serverless/active_instances";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            serverlessId: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ServerlessActiveInstancesResponse>;
