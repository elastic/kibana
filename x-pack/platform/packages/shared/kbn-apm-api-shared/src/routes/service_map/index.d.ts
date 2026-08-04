export declare const serviceMapRouteDefinitions: {
    serviceMap: {
        endpoint: "GET /internal/apm/service-map";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                serviceName: import("zod").ZodOptional<import("zod").ZodString>;
                serviceGroup: import("zod").ZodOptional<import("zod").ZodString>;
                kuery: import("zod").ZodOptional<import("zod").ZodString>;
                esQuery: import("zod").ZodOptional<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<any, string>>>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("@kbn/apm-types").ServiceMapResponse>;
    dependencyNode: {
        endpoint: "GET /internal/apm/service-map/dependency";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                dependencies: import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString>]>;
                sourceServiceName: import("zod").ZodOptional<import("zod").ZodString>;
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                offset: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./dependency_node").ServiceMapServiceDependencyInfoResponse>;
    serviceBadges: {
        endpoint: "POST /internal/apm/service-map/service_badges";
        params?: import("zod").ZodObject<{
            query: import("zod").ZodObject<{
                environment: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"ENVIRONMENT_NOT_DEFINED">, import("zod").ZodLiteral<"ENVIRONMENT_ALL">, import("zod").ZodString]>;
                start: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                end: import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<number, string>>;
                kuery: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod/v4/core").$strip>;
            body: import("zod").ZodObject<{
                serviceNames: import("zod").ZodPipe<import("zod").ZodPipe<import("zod").ZodString, import("zod").ZodTransform<any, string>>, import("zod").ZodArray<import("zod").ZodString>>;
            }, import("zod/v4/core").$strip>;
        }, import("zod/v4/core").$strip> | undefined;
    } & import("../types").WithResponse<import("./service_badges").ServiceMapServiceBadgesResponse>;
};
export type { ServiceMapRouteResponse } from './service_map';
export type { ServiceMapServiceDependencyInfoResponse } from './dependency_node';
export type { ServiceSloStatsResponse, ServiceMapServiceBadgesResponse } from './service_badges';
