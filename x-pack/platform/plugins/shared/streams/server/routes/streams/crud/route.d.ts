import type { z } from '@kbn/zod/v4';
import type { Streams } from '@kbn/streams-schema';
import type { UpsertStreamResponse } from '../../../lib/streams/client';
export declare const readStreamRoute: Record<"GET /api/streams/{name} 2023-10-31", import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/streams/{name} 2023-10-31", z.ZodObject<{
    path: z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, Streams.all.GetResponse, undefined>>;
export declare const listStreamsRoute: Record<"GET /api/streams 2023-10-31", import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/streams 2023-10-31", z.ZodObject<{}, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, {
    streams: Streams.all.Definition[];
}, undefined>>;
export declare const editStreamRoute: Record<"PUT /api/streams/{name} 2023-10-31", import("@kbn/server-route-repository-utils").ServerRoute<"PUT /api/streams/{name} 2023-10-31", z.ZodObject<{
    path: z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodType<Streams.all.UpsertRequest, unknown, z.core.$ZodTypeInternals<Streams.all.UpsertRequest, unknown>>;
}, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, UpsertStreamResponse, undefined>>;
export declare const deleteStreamRoute: Record<"DELETE /api/streams/{name} 2023-10-31", import("@kbn/server-route-repository-utils").ServerRoute<"DELETE /api/streams/{name} 2023-10-31", z.ZodObject<{
    path: z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, {
    acknowledged: true;
}, undefined>>;
export declare const crudRoutes: {
    "POST /internal/streams/_validate_classic_stream": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/_validate_classic_stream", z.ZodObject<{
        body: z.ZodObject<{
            name: z.ZodString;
            selectedTemplateName: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, {
        isValid: boolean;
        errorType: "duplicate";
        conflictingIndexPattern?: undefined;
    } | {
        isValid: boolean;
        errorType: "higherPriority";
        conflictingIndexPattern: string;
    } | {
        isValid: boolean;
        errorType: null;
        conflictingIndexPattern?: undefined;
    }, undefined>;
    "POST /internal/streams/_create_classic": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/_create_classic", z.ZodObject<{
        body: z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            ingest: z.ZodAny;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, UpsertStreamResponse, undefined>;
    "DELETE /api/streams/{name} 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"DELETE /api/streams/{name} 2023-10-31", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, {
        acknowledged: true;
    }, undefined>;
    "PUT /api/streams/{name} 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"PUT /api/streams/{name} 2023-10-31", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
        body: z.ZodType<Streams.all.UpsertRequest, unknown, z.core.$ZodTypeInternals<Streams.all.UpsertRequest, unknown>>;
    }, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, UpsertStreamResponse, undefined>;
    "GET /api/streams 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/streams 2023-10-31", z.ZodObject<{}, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, {
        streams: Streams.all.Definition[];
    }, undefined>;
    "GET /api/streams/{name} 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/streams/{name} 2023-10-31", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, Streams.all.GetResponse, undefined>;
};
