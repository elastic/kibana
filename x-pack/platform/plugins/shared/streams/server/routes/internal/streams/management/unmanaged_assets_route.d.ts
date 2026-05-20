import type { z } from '@kbn/zod/v4';
export declare const unmanagedAssetsRoute: Record<"GET /internal/streams/{name}/_unmanaged_assets", import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/_unmanaged_assets", z.ZodObject<{
    path: z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, import("../../../../lib/streams/stream_crud").UnmanagedElasticsearchAssetDetails, undefined>>;
