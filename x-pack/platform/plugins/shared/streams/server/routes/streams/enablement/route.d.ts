import type { z } from '@kbn/zod/v4';
import type { DisableStreamsResponse, EnableStreamsResponse } from '../../../lib/streams/client';
export declare const enableStreamsRoute: Record<"POST /api/streams/_enable 2023-10-31", import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/streams/_enable 2023-10-31", z.ZodObject<{}, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, EnableStreamsResponse, undefined>>;
export declare const disableStreamsRoute: Record<"POST /api/streams/_disable 2023-10-31", import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/streams/_disable 2023-10-31", z.ZodObject<{}, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, DisableStreamsResponse, undefined>>;
export declare const enablementRoutes: {
    "POST /api/streams/_disable 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/streams/_disable 2023-10-31", z.ZodObject<{}, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, DisableStreamsResponse, undefined>;
    "POST /api/streams/_enable 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/streams/_enable 2023-10-31", z.ZodObject<{}, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, EnableStreamsResponse, undefined>;
};
