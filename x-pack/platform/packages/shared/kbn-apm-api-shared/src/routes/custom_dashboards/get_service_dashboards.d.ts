import { z } from '@kbn/zod/v4';
import type { SavedApmCustomDashboard } from '@kbn/apm-types';
export interface GetServiceDashboardsResponse {
    serviceDashboards: SavedApmCustomDashboard[];
}
export declare const getServiceDashboardsRoute: {
    endpoint: "GET /internal/apm/services/{serviceName}/dashboards";
    params?: z.ZodObject<{
        path: z.ZodObject<{
            serviceName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            start: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
            end: z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<GetServiceDashboardsResponse>;
