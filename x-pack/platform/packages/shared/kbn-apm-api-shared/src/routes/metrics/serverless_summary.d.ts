import { z } from '@kbn/zod/v4';
export type AwsLambdaArchitecture = 'arm' | 'x86_64';
export type AWSLambdaPriceFactor = Record<AwsLambdaArchitecture, number>;
export interface ServerlessSummaryResponse {
    memoryUsageAvgRate: number | undefined;
    serverlessFunctionsTotal: number | undefined;
    serverlessDurationAvg: number | null | undefined;
    billedDurationAvg: number | null | undefined;
    estimatedCost: number | undefined;
}
export declare const serverlessSummaryRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/metrics/serverless/summary";
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
} & import("../types").WithResponse<ServerlessSummaryResponse>;
