import type { z } from '@kbn/zod/v4';
export declare const suggestDescriptionRoute: Record<"POST /internal/streams/{name}/_suggest_description", import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/_suggest_description", z.ZodObject<{
    path: z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodObject<{
        connector_id: z.ZodString;
        start: z.ZodNumber;
        end: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
    description: string;
}, undefined>>;
