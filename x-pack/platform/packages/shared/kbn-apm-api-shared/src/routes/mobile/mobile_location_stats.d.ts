import { z } from '@kbn/zod/v4';
import type { Maybe } from '@kbn/apm-types-shared';
type Timeseries = Array<{
    x: number;
    y: number;
}>;
interface LocationStats {
    mostSessions: {
        location?: string;
        value: Maybe<number>;
        timeseries: Timeseries;
    };
    mostRequests: {
        location?: string;
        value: Maybe<number>;
        timeseries: Timeseries;
    };
    mostCrashes: {
        location?: string;
        value: Maybe<number>;
        timeseries: Timeseries;
    };
    mostLaunches: {
        location?: string;
        value: Maybe<number>;
        timeseries: Timeseries;
    };
}
export interface MobileLocationStats {
    currentPeriod: LocationStats;
    previousPeriod: LocationStats;
}
export declare const mobileLocationStatsRoute: {
    endpoint: "GET /internal/apm/mobile-services/{serviceName}/location/stats";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            locationField: z.ZodOptional<z.ZodString>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            offset: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<MobileLocationStats>;
export {};
