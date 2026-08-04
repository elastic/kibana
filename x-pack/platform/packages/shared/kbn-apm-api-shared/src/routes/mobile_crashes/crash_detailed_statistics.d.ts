import { z } from '@kbn/zod/v4';
import { type Coordinate } from '@kbn/apm-types';
export interface CrashGroupDetailedStat {
    groupId: string;
    timeseries: Coordinate[];
}
export interface MobileCrashesGroupPeriodsResponse {
    currentPeriod: Record<string, CrashGroupDetailedStat>;
    previousPeriod: Record<string, CrashGroupDetailedStat>;
}
export declare const crashDetailedStatisticsRoute: {
    endpoint: "POST /internal/apm/mobile-services/{serviceName}/crashes/groups/detailed_statistics";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            offset: z.ZodOptional<z.ZodString>;
            numBuckets: z.ZodCoercedNumber<unknown>;
        }, z.core.$strip>;
        body: z.ZodObject<{
            groupIds: z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodTransform<any, string>>, z.ZodArray<z.ZodString>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<MobileCrashesGroupPeriodsResponse>;
