import { z } from '@kbn/zod/v4';
import type { SavedApmCustomDashboard } from '@kbn/apm-types';
export type SaveServiceDashboardResponse = SavedApmCustomDashboard;
export declare const saveServiceDashboardRoute: {
    endpoint: "POST /internal/apm/custom-dashboard";
    params?: z.ZodObject<{
        query: z.ZodOptional<z.ZodObject<{
            customDashboardId: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        body: z.ZodObject<{
            dashboardSavedObjectId: z.ZodString;
            kuery: z.ZodOptional<z.ZodString>;
            serviceNameFilterEnabled: z.ZodBoolean;
            serviceEnvironmentFilterEnabled: z.ZodBoolean;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<SavedApmCustomDashboard>;
