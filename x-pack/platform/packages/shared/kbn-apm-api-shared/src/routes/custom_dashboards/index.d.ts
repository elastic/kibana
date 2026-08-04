export declare const customDashboardsRouteDefinitions: {
    saveServiceDashboard: {
        endpoint: "POST /internal/apm/custom-dashboard";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodOptional<import("zod").ZodObject<{
                customDashboardId: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>>;
            body: import("zod").ZodObject<{
                dashboardSavedObjectId: import("zod").ZodString;
                kuery: import("zod").ZodOptional<import("zod").ZodString>;
                serviceNameFilterEnabled: import("zod").ZodBoolean;
                serviceEnvironmentFilterEnabled: import("zod").ZodBoolean;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("@kbn/apm-types").SavedApmCustomDashboard>;
    getServiceDashboards: {
        endpoint: "GET /internal/apm/services/{serviceName}/dashboards";
        params?: import("zod").ZodObject<{
            path: import("zod").ZodObject<{
                serviceName: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
            query: import("zod").ZodObject<{
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./get_service_dashboards").GetServiceDashboardsResponse>;
    deleteServiceDashboard: {
        endpoint: "DELETE /internal/apm/custom-dashboard";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                customDashboardId: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<void>;
};
export type { SaveServiceDashboardResponse } from './save_service_dashboard';
export type { GetServiceDashboardsResponse } from './get_service_dashboards';
