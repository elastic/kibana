import type { z } from '@kbn/zod/v4';
export declare const internalTasksRoutes: {
    "DELETE /internal/streams/_tasks/{id}": import("@kbn/server-route-repository-utils").ServerRoute<"DELETE /internal/streams/_tasks/{id}", z.ZodObject<{
        path: z.ZodObject<{
            id: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
        acknowledged: boolean;
    }, undefined>;
    "GET /internal/streams/_tasks": {
        endpoint: "GET /internal/streams/_tasks";
        handler: (options: import("../../../types").RouteDependencies & import("@kbn/server-route-repository-utils").DefaultRouteHandlerResources) => Promise<{
            tasks: Array<{
                id: string;
                created_at: string;
            }>;
        }>;
        security: import("@kbn/core/server").RouteSecurity;
    };
};
