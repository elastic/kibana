import type { z } from '@kbn/zod/v4';
import type { Streams } from '@kbn/streams-schema';
export interface QueryStreamObjectGetResponse {
    /** The view reference stored in the definition */
    query: Streams.QueryStream.Definition['query'] & {
        esql: string;
    };
    /** Field descriptions map (field name -> description) */
    field_descriptions?: Record<string, string>;
}
export declare const queryStreamRoutes: {
    "PUT /api/streams/{name}/_query 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"PUT /api/streams/{name}/_query 2023-10-31", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
        body: z.ZodObject<{
            query: z.ZodObject<{
                esql: z.ZodString;
            }, z.core.$strip>;
            field_descriptions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, import("../../../lib/streams/client").UpsertStreamResponse, undefined>;
    "GET /api/streams/{name}/_query 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/streams/{name}/_query 2023-10-31", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, QueryStreamObjectGetResponse, undefined>;
};
