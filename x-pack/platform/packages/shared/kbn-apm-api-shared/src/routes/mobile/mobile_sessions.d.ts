import { z } from '@kbn/zod/v4';
import { type Coordinate } from '@kbn/apm-types';
export interface SessionsTimeseries {
    currentPeriod: {
        timeseries: Coordinate[];
        value: number | null | undefined;
    };
    previousPeriod: {
        timeseries: Coordinate[];
        value: number | null | undefined;
    };
}
export declare const mobileSessionsRoute: {
    endpoint: "GET /internal/apm/mobile-services/{serviceName}/transactions/charts/sessions";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            transactionType: z.ZodOptional<z.ZodString>;
            transactionName: z.ZodOptional<z.ZodString>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            offset: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<SessionsTimeseries>;
