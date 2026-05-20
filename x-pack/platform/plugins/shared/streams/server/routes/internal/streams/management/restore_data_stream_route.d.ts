import type { z } from '@kbn/zod/v4';
export declare const restoreDataStreamRoute: Record<"POST /internal/streams/{name}/_restore_data_stream", import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/_restore_data_stream", z.ZodObject<{
    path: z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
    acknowledged: true;
}, undefined>>;
