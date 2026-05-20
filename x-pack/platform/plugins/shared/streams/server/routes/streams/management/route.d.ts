import { z } from '@kbn/zod/v4';
import type { ResyncStreamsResponse } from '../../../lib/streams/client';
export declare const forkStreamsRoute: Record<"POST /api/streams/{name}/_fork 2023-10-31", import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/streams/{name}/_fork 2023-10-31", z.ZodObject<{
    path: z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodObject<{
        stream: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
        where: z.ZodType<import("@kbn/streamlang").Condition, unknown, z.core.$ZodTypeInternals<import("@kbn/streamlang").Condition, unknown>>;
        status: z.ZodOptional<z.ZodEnum<{
            disabled: "disabled";
            enabled: "enabled";
        }>>;
        draft: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>;
}, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, {
    acknowledged: true;
}, undefined>>;
export declare const resyncStreamsRoute: Record<"POST /api/streams/_resync 2023-10-31", import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/streams/_resync 2023-10-31", z.ZodObject<{}, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, ResyncStreamsResponse, undefined>>;
export declare const getStreamsStatusRoute: Record<"GET /api/streams/_status", {
    endpoint: "GET /api/streams/_status";
    handler: (options: import("../../types").RouteDependencies & import("@kbn/server-route-repository-utils").DefaultRouteHandlerResources) => Promise<{
        logs: boolean | "conflict";
        'logs.otel': boolean | "conflict";
        'logs.ecs': boolean | "conflict";
        can_manage: boolean;
    }>;
    security: import("@kbn/core/server").RouteSecurity;
}>;
export declare const getClassicStreamsStatusRoute: Record<"GET /internal/streams/_classic_status", {
    endpoint: "GET /internal/streams/_classic_status";
    handler: (options: import("../../types").RouteDependencies & import("@kbn/server-route-repository-utils").DefaultRouteHandlerResources) => Promise<{
        can_manage: boolean;
    }>;
    security: import("@kbn/core/server").RouteSecurity;
}>;
export declare const managementRoutes: {
    "GET /internal/streams/_classic_status": {
        endpoint: "GET /internal/streams/_classic_status";
        handler: (options: import("../../types").RouteDependencies & import("@kbn/server-route-repository-utils").DefaultRouteHandlerResources) => Promise<{
            can_manage: boolean;
        }>;
        security: import("@kbn/core/server").RouteSecurity;
    };
    "GET /api/streams/_status": {
        endpoint: "GET /api/streams/_status";
        handler: (options: import("../../types").RouteDependencies & import("@kbn/server-route-repository-utils").DefaultRouteHandlerResources) => Promise<{
            logs: boolean | "conflict";
            'logs.otel': boolean | "conflict";
            'logs.ecs': boolean | "conflict";
            can_manage: boolean;
        }>;
        security: import("@kbn/core/server").RouteSecurity;
    };
    "POST /api/streams/_resync 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/streams/_resync 2023-10-31", z.ZodObject<{}, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, ResyncStreamsResponse, undefined>;
    "POST /api/streams/{name}/_fork 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/streams/{name}/_fork 2023-10-31", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
        body: z.ZodObject<{
            stream: z.ZodObject<{
                name: z.ZodString;
            }, z.core.$strip>;
            where: z.ZodType<import("@kbn/streamlang").Condition, unknown, z.core.$ZodTypeInternals<import("@kbn/streamlang").Condition, unknown>>;
            status: z.ZodOptional<z.ZodEnum<{
                disabled: "disabled";
                enabled: "enabled";
            }>>;
            draft: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, {
        acknowledged: true;
    }, undefined>;
};
