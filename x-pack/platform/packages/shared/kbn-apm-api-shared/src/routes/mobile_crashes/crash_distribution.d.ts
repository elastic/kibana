import { z } from '@kbn/zod/v4';
import { type Coordinate } from '@kbn/apm-types';
export interface CrashDistributionResponse {
    currentPeriod: Array<{
        x: number;
        y: number;
    }>;
    previousPeriod: Coordinate[];
    bucketSize: number;
}
export declare const crashDistributionRoute: {
    endpoint: "GET /internal/apm/mobile-services/{serviceName}/crashes/distribution";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            groupId: z.ZodOptional<z.ZodString>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            offset: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<CrashDistributionResponse>;
