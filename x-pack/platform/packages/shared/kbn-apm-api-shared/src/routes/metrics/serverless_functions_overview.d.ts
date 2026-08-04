import { z } from '@kbn/zod/v4';
export type ServerlessFunctionsOverviewResponse = Array<{
    serverlessId: string;
    serverlessFunctionName: string;
    serverlessDurationAvg: number | null;
    billedDurationAvg: number | null;
    coldStartCount: number | null;
    avgMemoryUsed: number | undefined;
    memorySize: number | null;
}>;
export interface ServerlessFunctionsOverviewRouteResponse {
    serverlessFunctionsOverview: ServerlessFunctionsOverviewResponse;
}
export declare const serverlessFunctionsOverviewRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/metrics/serverless/functions_overview";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ServerlessFunctionsOverviewRouteResponse>;
