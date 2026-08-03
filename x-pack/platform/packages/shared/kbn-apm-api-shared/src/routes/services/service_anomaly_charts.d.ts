import { z } from '@kbn/zod/v4';
import type { ServiceAnomalyTimeseries } from '@kbn/apm-types';
export interface ServiceAnomalyChartsResponse {
    allAnomalyTimeseries: ServiceAnomalyTimeseries[];
}
export declare const serviceAnomalyChartsRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/anomaly_charts";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            transactionType: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ServiceAnomalyChartsResponse>;
