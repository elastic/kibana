import { type SignificantEventsGenerateResponse, type SignificantEventsGetResponse, type SignificantEventsPreviewResponse } from '@kbn/streams-schema';
import type { z } from '@kbn/zod/v4';
export declare const significantEventsRoutes: {
    "POST /api/streams/{name}/significant_events/_generate 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/streams/{name}/significant_events/_generate 2023-10-31", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            connectorId: z.ZodOptional<z.ZodString>;
            from: z.ZodPipe<z.ZodString, z.ZodTransform<Date, string>>;
            to: z.ZodPipe<z.ZodString, z.ZodTransform<Date, string>>;
            sampleDocsSize: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, SignificantEventsGenerateResponse, undefined>;
    "POST /api/streams/{name}/significant_events/_preview 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/streams/{name}/significant_events/_preview 2023-10-31", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            from: z.ZodPipe<z.ZodString, z.ZodTransform<Date, string>>;
            to: z.ZodPipe<z.ZodString, z.ZodTransform<Date, string>>;
            bucketSize: z.ZodString;
        }, z.core.$strip>;
        body: z.ZodObject<{
            query: z.ZodObject<{
                esql: z.ZodObject<{
                    query: z.ZodString;
                }, z.core.$strip>;
            }, z.core.$strip>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, SignificantEventsPreviewResponse, undefined>;
    "GET /api/streams/{name}/significant_events 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/streams/{name}/significant_events 2023-10-31", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodObject<{
            from: z.ZodPipe<z.ZodString, z.ZodTransform<Date, string>>;
            to: z.ZodPipe<z.ZodString, z.ZodTransform<Date, string>>;
            bucketSize: z.ZodString;
            query: z.ZodOptional<z.ZodString>;
            searchMode: z.ZodOptional<z.ZodEnum<{
                keyword: "keyword";
                semantic: "semantic";
                hybrid: "hybrid";
            }>>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, SignificantEventsGetResponse, undefined>;
};
