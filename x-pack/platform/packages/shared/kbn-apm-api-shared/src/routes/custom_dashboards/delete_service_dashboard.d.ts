import { z } from '@kbn/zod/v4';
export declare const deleteServiceDashboardRoute: {
    endpoint: "DELETE /internal/apm/custom-dashboard";
    params?: z.ZodObject<{
        query: z.ZodObject<{
            customDashboardId: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<void>;
