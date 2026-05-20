import type { z } from '@kbn/zod/v4';
import type { PromptsConfigAttributes } from '../../../../lib/sig_events/saved_objects/prompts_config_service';
export declare const setStreamsPromptRoute: Record<"PUT /internal/streams/_prompts", import("@kbn/server-route-repository-utils").ServerRoute<"PUT /internal/streams/_prompts", z.ZodObject<{
    body: z.ZodObject<{
        featurePromptOverride: z.ZodOptional<z.ZodString>;
        significantEventsPromptOverride: z.ZodOptional<z.ZodString>;
        descriptionPromptOverride: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
    results: PromptsConfigAttributes;
}, undefined>>;
export declare const resetStreamsPromptRoute: Record<"DELETE /internal/streams/_prompts", import("@kbn/server-route-repository-utils").ServerRoute<"DELETE /internal/streams/_prompts", z.ZodObject<{}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
    success: boolean;
}, undefined>>;
export declare const getStreamsPromptRoute: Record<"GET /internal/streams/_prompts", import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/_prompts", z.ZodObject<{}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, Readonly<{
    featurePromptOverride?: string | undefined;
    significantEventsPromptOverride?: string | undefined;
    descriptionPromptOverride?: string | undefined;
    systemsPromptOverride?: string | undefined;
} & {}>, undefined>>;
export declare const internalPromptsRoutes: {
    "DELETE /internal/streams/_prompts": import("@kbn/server-route-repository-utils").ServerRoute<"DELETE /internal/streams/_prompts", z.ZodObject<{}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
        success: boolean;
    }, undefined>;
    "GET /internal/streams/_prompts": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/_prompts", z.ZodObject<{}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, Readonly<{
        featurePromptOverride?: string | undefined;
        significantEventsPromptOverride?: string | undefined;
        descriptionPromptOverride?: string | undefined;
        systemsPromptOverride?: string | undefined;
    } & {}>, undefined>;
    "PUT /internal/streams/_prompts": import("@kbn/server-route-repository-utils").ServerRoute<"PUT /internal/streams/_prompts", z.ZodObject<{
        body: z.ZodObject<{
            featurePromptOverride: z.ZodOptional<z.ZodString>;
            significantEventsPromptOverride: z.ZodOptional<z.ZodString>;
            descriptionPromptOverride: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
        results: PromptsConfigAttributes;
    }, undefined>;
};
