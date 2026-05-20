import { z } from '@kbn/zod/v4';
export declare const getFailureStoreStatsRoute: Record<"GET /internal/streams/{name}/failure_store/stats", import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/failure_store/stats", z.ZodObject<{
    path: z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
    stats: null;
} | {
    stats: import("@kbn/streams-schema").FailureStoreStatsResponse;
}, undefined>>;
export declare const getFailureStoreDefaultRetentionRoute: Record<"GET /internal/streams/failure_store/default_retention", {
    endpoint: "GET /internal/streams/failure_store/default_retention";
    handler: (options: import("../../../types").RouteDependencies & import("@kbn/server-route-repository-utils").DefaultRouteHandlerResources) => Promise<{
        default_retention: string | undefined;
    }>;
    security: import("@kbn/core/server").RouteSecurity;
}>;
export declare const failureStoreRoutes: {
    "GET /internal/streams/failure_store/default_retention": {
        endpoint: "GET /internal/streams/failure_store/default_retention";
        handler: (options: import("../../../types").RouteDependencies & import("@kbn/server-route-repository-utils").DefaultRouteHandlerResources) => Promise<{
            default_retention: string | undefined;
        }>;
        security: import("@kbn/core/server").RouteSecurity;
    };
    "GET /internal/streams/{name}/failure_store/stats": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/failure_store/stats", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
        stats: null;
    } | {
        stats: import("@kbn/streams-schema").FailureStoreStatsResponse;
    }, undefined>;
};
