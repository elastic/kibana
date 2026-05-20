import { z } from '@kbn/zod/v4';
import type { GenerateDescriptionResult, TaskResult } from '@kbn/streams-schema';
export type DescriptionGenerationTaskResult = TaskResult<GenerateDescriptionResult>;
export declare const descriptionGenerationStatusRoute: Record<"GET /internal/streams/{name}/_description_generation/_status", import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/_description_generation/_status", z.ZodObject<{
    path: z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, DescriptionGenerationTaskResult, undefined>>;
export declare const descriptionGenerationTaskRoute: Record<"POST /internal/streams/{name}/_description_generation/_task", import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/_description_generation/_task", z.ZodObject<{
    path: z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodDiscriminatedUnion<[z.ZodObject<{
        action: z.ZodLiteral<"schedule">;
        from: z.ZodPipe<z.ZodString, z.ZodTransform<Date, string>>;
        to: z.ZodPipe<z.ZodString, z.ZodTransform<Date, string>>;
        connectorId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        action: z.ZodLiteral<"cancel">;
    }, z.core.$strip>, z.ZodObject<{
        action: z.ZodLiteral<"acknowledge">;
    }, z.core.$strip>], "action">;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, DescriptionGenerationTaskResult, undefined>>;
export declare const internalDescriptionGenerationRoutes: {
    "POST /internal/streams/{name}/_description_generation/_task": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/{name}/_description_generation/_task", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
        body: z.ZodDiscriminatedUnion<[z.ZodObject<{
            action: z.ZodLiteral<"schedule">;
            from: z.ZodPipe<z.ZodString, z.ZodTransform<Date, string>>;
            to: z.ZodPipe<z.ZodString, z.ZodTransform<Date, string>>;
            connectorId: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>, z.ZodObject<{
            action: z.ZodLiteral<"cancel">;
        }, z.core.$strip>, z.ZodObject<{
            action: z.ZodLiteral<"acknowledge">;
        }, z.core.$strip>], "action">;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, DescriptionGenerationTaskResult, undefined>;
    "GET /internal/streams/{name}/_description_generation/_status": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{name}/_description_generation/_status", z.ZodObject<{
        path: z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, DescriptionGenerationTaskResult, undefined>;
};
