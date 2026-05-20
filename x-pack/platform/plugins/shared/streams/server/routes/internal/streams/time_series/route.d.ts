import type { z } from '@kbn/zod/v4';
export declare const getTimeSeriesCountRoute: Record<"GET /internal/streams/{name}/time_series/_count", import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/time_series/_count", z.ZodObject<{
    path: z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
    timeSeriesCount: null;
} | {
    timeSeriesCount: number;
}, undefined>>;
export declare const timeSeriesRoutes: {
    "GET /internal/streams/{name}/time_series/_count": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/time_series/_count", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
        timeSeriesCount: null;
    } | {
        timeSeriesCount: number;
    }, undefined>;
};
