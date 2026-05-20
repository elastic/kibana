import { z } from '@kbn/zod/v4';
import type { StreamDocsStat } from '../../../../common';
export declare const docCountsRoutes: {
    "GET /internal/streams/doc_counts/failed": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/doc_counts/failed", z.ZodObject<{
        query: z.ZodObject<{
            start: z.ZodCoercedNumber<unknown>;
            end: z.ZodCoercedNumber<unknown>;
            stream: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, StreamDocsStat[], undefined>;
    "GET /internal/streams/doc_counts/total": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/doc_counts/total", z.ZodObject<{
        query: z.ZodOptional<z.ZodObject<{
            stream: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, StreamDocsStat[], undefined>;
    "GET /internal/streams/doc_counts/degraded": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/doc_counts/degraded", z.ZodObject<{
        query: z.ZodOptional<z.ZodObject<{
            stream: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, StreamDocsStat[], undefined>;
};
