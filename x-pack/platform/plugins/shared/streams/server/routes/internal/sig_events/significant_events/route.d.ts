import type { SignificantEventsGetResponse } from '@kbn/streams-schema';
import { type SignificantEventsQueriesGenerationTaskResult } from '@kbn/streams-schema';
import type { z } from '@kbn/zod/v4';
export declare const internalSignificantEventsRoutes: {
    "GET /internal/streams/_significant_events": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/_significant_events", z.ZodObject<{
        query: z.ZodObject<{
            from: z.ZodPipe<z.ZodString, z.ZodTransform<Date, string>>;
            to: z.ZodPipe<z.ZodString, z.ZodTransform<Date, string>>;
            bucketSize: z.ZodString;
            query: z.ZodOptional<z.ZodString>;
            streamNames: z.ZodOptional<z.ZodUnion<readonly [z.ZodPipe<z.ZodString, z.ZodTransform<string[], string>>, z.ZodArray<z.ZodString>]>>;
            searchMode: z.ZodOptional<z.ZodEnum<{
                keyword: "keyword";
                semantic: "semantic";
                hybrid: "hybrid";
            }>>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, SignificantEventsGetResponse, undefined>;
    "POST /internal/streams/{name}/significant_events/_task": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/significant_events/_task", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
        body: z.ZodDiscriminatedUnion<[z.ZodObject<{
            action: z.ZodLiteral<"schedule">;
            from: z.ZodPipe<z.ZodString, z.ZodTransform<Date, string>>;
            to: z.ZodPipe<z.ZodString, z.ZodTransform<Date, string>>;
        }, z.core.$strip>, z.ZodObject<{
            action: z.ZodLiteral<"cancel">;
        }, z.core.$strip>, z.ZodObject<{
            action: z.ZodLiteral<"acknowledge">;
        }, z.core.$strip>], "action">;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, SignificantEventsQueriesGenerationTaskResult, undefined>;
    "GET /internal/streams/{name}/significant_events/_status": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/significant_events/_status", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, SignificantEventsQueriesGenerationTaskResult, undefined>;
};
