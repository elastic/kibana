export declare const serviceGroupsRouteDefinitions: {
    list: {
        endpoint: "GET /internal/apm/service-groups";
        params?: undefined;
    } & import("../types").WithResponse<import("./get_service_groups").ServiceGroupsResponse>;
    get: {
        endpoint: "GET /internal/apm/service-group";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                serviceGroup: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./get_service_group").ServiceGroupResponse>;
    save: {
        endpoint: "POST /internal/apm/service-group";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodOptional<import("zod").ZodObject<{
                serviceGroupId: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>>;
            body: import("zod").ZodObject<{
                groupName: import("zod").ZodString;
                kuery: import("zod").ZodString;
                description: import("zod").ZodOptional<import("zod").ZodString>;
                color: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("@kbn/apm-types").SavedServiceGroup>;
    delete: {
        endpoint: "DELETE /internal/apm/service-group";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                serviceGroupId: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<void>;
    services: {
        endpoint: "GET /internal/apm/service-group/services";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                kuery: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./lookup_services").LookupServicesRouteResponse>;
    counts: {
        endpoint: "GET /internal/apm/service-group/counts";
        params?: undefined;
    } & import("../types").WithResponse<import("./service_group_counts").ServiceGroupCounts>;
};
export type { ServiceGroupsResponse } from './get_service_groups';
export type { ServiceGroupResponse } from './get_service_group';
export type { SaveServiceGroupResponse } from './save_service_group';
export type { LookupServicesResponse, LookupServicesRouteResponse } from './lookup_services';
export type { ServiceGroupCounts } from './service_group_counts';
