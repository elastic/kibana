import { z } from '@kbn/zod/v4';
export interface ObservabilityOverviewResponse {
    serviceCount: number;
    transactionPerMinute: {
        value: number | undefined;
        timeseries: Array<{
            x: number;
            y: number | null;
        }>;
    };
}
export declare const observabilityOverviewRoute: {
    endpoint: "GET /internal/apm/observability_overview";
    params?: z.ZodObject<{
        query: z.ZodObject<{
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            bucketSize: z.ZodCoercedNumber<unknown>;
            intervalString: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ObservabilityOverviewResponse>;
