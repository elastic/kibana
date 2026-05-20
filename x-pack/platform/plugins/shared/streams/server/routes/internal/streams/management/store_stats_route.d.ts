import type { z } from '@kbn/zod/v4';
export interface StreamStoreStat {
    store_size_bytes: number;
}
export declare const storeStatsRoute: Record<"GET /internal/streams/{name}/_store_stats", import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/_store_stats", z.ZodObject<{
    path: z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, StreamStoreStat, undefined>>;
