import { z } from '@kbn/zod/v4';
import { type Coordinate } from '@kbn/apm-types';
export interface MobileHttpErrorsTimeseries {
    currentPeriod: {
        timeseries: Coordinate[];
    };
    previousPeriod: {
        timeseries: Coordinate[];
    };
}
export declare const mobileHttpErrorRateRoute: {
    endpoint: "GET /internal/apm/mobile-services/{serviceName}/error/http_error_rate";
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
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<MobileHttpErrorsTimeseries>;
