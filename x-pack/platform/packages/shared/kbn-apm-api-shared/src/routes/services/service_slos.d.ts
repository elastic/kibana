import { z } from '@kbn/zod/v4';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
export interface StatusCounts {
    violated: number;
    degrading: number;
    healthy: number;
    noData: number;
}
export interface ServiceSlosResponse {
    results: SLOWithSummaryResponse[];
    total: number;
    page: number;
    perPage: number;
    activeAlerts: Record<string, number>;
    statusCounts: StatusCounts;
}
export declare const serviceSlosRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/slos";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            environment: z.ZodUnion<readonly [z.ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, z.ZodLiteral<"ENVIRONMENT_ALL">, z.ZodString]>;
            page: z.ZodCoercedNumber<unknown>;
            perPage: z.ZodCoercedNumber<unknown>;
            statusFilters: z.ZodOptional<z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodTransform<any, string>>, z.ZodArray<z.ZodString>>>;
            kqlQuery: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ServiceSlosResponse>;
