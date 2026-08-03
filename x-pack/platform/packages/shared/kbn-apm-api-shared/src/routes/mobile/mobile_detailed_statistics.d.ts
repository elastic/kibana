import { z } from '@kbn/zod/v4';
import { type Coordinate } from '@kbn/apm-types';
export interface MobileDetailedStatistics {
    fieldName: string;
    latency: Coordinate[];
    throughput: Coordinate[];
}
export interface MobileDetailedStatisticsResponse {
    currentPeriod: Record<string, MobileDetailedStatistics>;
    previousPeriod: Record<string, MobileDetailedStatistics>;
}
export declare const mobileDetailedStatisticsRoute: {
    endpoint: "GET /internal/apm/mobile-services/{serviceName}/detailed_statistics";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            field: z.ZodString;
            fieldValues: z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodTransform<any, string>>, z.ZodArray<z.ZodString>>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            offset: z.ZodOptional<z.ZodString>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<MobileDetailedStatisticsResponse>;
