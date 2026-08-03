import { z } from '@kbn/zod/v4';
import { type Coordinate } from '@kbn/apm-types';
export interface ColdstartRateResponse {
    currentPeriod: {
        transactionColdstartRate: Coordinate[];
        average: number | null;
    };
    previousPeriod: {
        transactionColdstartRate: Coordinate[];
        average: number | null;
    };
}
export declare const transactionChartsColdstartRateRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/transactions/charts/coldstart_rate";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            transactionType: z.ZodString;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            kuery: z.ZodString;
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            offset: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ColdstartRateResponse>;
