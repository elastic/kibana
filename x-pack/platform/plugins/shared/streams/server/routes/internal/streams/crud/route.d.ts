import { z } from '@kbn/zod/v4';
import type { estypes } from '@elastic/elasticsearch';
import type { ClassicIngestStreamEffectiveLifecycle } from '@kbn/streams-schema';
import { Streams } from '@kbn/streams-schema';
import type { StreamSummary } from '../../../../../common';
export interface ListStreamDetail {
    stream: Streams.all.Definition;
    effective_lifecycle?: ClassicIngestStreamEffectiveLifecycle;
    data_stream?: estypes.IndicesDataStream;
    privileges: {
        read_failure_store: boolean;
    };
}
export declare const listStreamsRoute: Record<"GET /internal/streams", import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams", z.ZodObject<{}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
    streams: ListStreamDetail[];
}, undefined>>;
export interface StreamDetailsResponse {
    details: {
        count: number;
    };
}
export declare const streamDetailRoute: Record<"GET /internal/streams/{name}/_details", import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/_details", z.ZodObject<{
    path: z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>;
    query: z.ZodObject<{
        start: z.ZodString;
        end: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, StreamDetailsResponse, undefined>>;
export declare const resolveIndexRoute: Record<"GET /internal/streams/_resolve_index", import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/_resolve_index", z.ZodObject<{
    query: z.ZodObject<{
        index: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
    stream?: Streams.all.Definition;
}, undefined>>;
export declare const bulkGetStreamSummariesRoute: Record<"POST /internal/streams/_bulk_get_summaries", import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/_bulk_get_summaries", z.ZodObject<{
    body: z.ZodObject<{
        names: z.ZodArray<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
    summaries: StreamSummary[];
}, undefined>>;
export declare const internalCrudRoutes: {
    "POST /internal/streams/_bulk_get_summaries": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/_bulk_get_summaries", z.ZodObject<{
        body: z.ZodObject<{
            names: z.ZodArray<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
        summaries: StreamSummary[];
    }, undefined>;
    "GET /internal/streams/_resolve_index": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/_resolve_index", z.ZodObject<{
        query: z.ZodObject<{
            index: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
        stream?: Streams.all.Definition;
    }, undefined>;
    "GET /internal/streams/{name}/_details": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/_details", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            start: z.ZodString;
            end: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, StreamDetailsResponse, undefined>;
    "GET /internal/streams": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams", z.ZodObject<{}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
        streams: ListStreamDetail[];
    }, undefined>;
};
