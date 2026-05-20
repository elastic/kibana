import { z } from '@kbn/zod/v4';
export declare const getConnectorByIdRoute: Record<"GET /internal/streams/connectors/{connectorId}", import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/connectors/{connectorId}", z.ZodObject<{
    path: z.ZodObject<{
        connectorId: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, import("@kbn/inference-common").InferenceConnector, undefined>>;
export declare const connectorRoutes: {
    "GET /internal/streams/connectors/{connectorId}": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/connectors/{connectorId}", z.ZodObject<{
        path: z.ZodObject<{
            connectorId: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, import("@kbn/inference-common").InferenceConnector, undefined>;
};
