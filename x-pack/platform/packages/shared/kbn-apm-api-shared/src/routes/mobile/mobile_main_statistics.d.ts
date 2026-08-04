import { z } from '@kbn/zod/v4';
export interface MobileMainStatisticsResponse {
    mainStatistics: Array<{
        name: string | number;
        latency: number | null;
        throughput: number;
        crashRate: number;
    }>;
}
export declare const mobileMainStatisticsRoute: {
    endpoint: "GET /internal/apm/mobile-services/{serviceName}/main_statistics";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            field: z.ZodString;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<MobileMainStatisticsResponse>;
