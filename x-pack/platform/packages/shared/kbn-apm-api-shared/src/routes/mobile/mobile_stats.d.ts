import { z } from '@kbn/zod/v4';
interface MobileStatsTimeseries {
    x: number;
    y: number;
}
interface MobileStats {
    sessions: {
        timeseries: MobileStatsTimeseries[];
        value: number | null | undefined;
    };
    requests: {
        timeseries: MobileStatsTimeseries[];
        value: number | null | undefined;
    };
    crashRate: {
        timeseries: MobileStatsTimeseries[];
        value: number | null | undefined;
    };
    launchTimes: {
        timeseries: MobileStatsTimeseries[];
        value: number | null | undefined;
    };
}
export interface MobilePeriodStats {
    currentPeriod: MobileStats;
    previousPeriod: MobileStats;
}
export declare const mobileStatsRoute: {
    endpoint: "GET /internal/apm/mobile-services/{serviceName}/stats";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            transactionType: z.ZodOptional<z.ZodString>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            offset: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<MobilePeriodStats>;
export {};
