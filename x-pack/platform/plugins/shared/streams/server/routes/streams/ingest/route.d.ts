import { z } from '@kbn/zod/v4';
import { Streams } from '@kbn/streams-schema';
import { IngestUpsertRequest } from '@kbn/streams-schema';
export declare const ingestRoutes: {
    "PUT /api/streams/{name}/_ingest 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"PUT /api/streams/{name}/_ingest 2023-10-31", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
        body: z.ZodObject<{
            ingest: z.ZodType<IngestUpsertRequest, unknown, z.core.$ZodTypeInternals<IngestUpsertRequest, unknown>>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, import("../../../lib/streams/client").UpsertStreamResponse, undefined>;
    "GET /api/streams/{name}/_ingest 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/streams/{name}/_ingest 2023-10-31", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, {
        ingest: Streams.ingest.all.Definition["ingest"];
    }, undefined>;
};
