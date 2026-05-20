import { z } from '@kbn/zod/v4';
export declare const putSignificantEventsSettingsRoute: Record<"PUT /internal/streams/_significant_events/settings", import("@kbn/server-route-repository-utils").ServerRoute<"PUT /internal/streams/_significant_events/settings", z.ZodObject<{
    body: z.ZodObject<{
        continuousKiExtraction: z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            intervalHours: z.ZodOptional<z.ZodNumber>;
            excludedStreamPatterns: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
    success: true;
}, undefined>>;
export declare const internalSignificantEventsSettingsRoutes: {
    "PUT /internal/streams/_significant_events/settings": import("@kbn/server-route-repository-utils").ServerRoute<"PUT /internal/streams/_significant_events/settings", z.ZodObject<{
        body: z.ZodObject<{
            continuousKiExtraction: z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                intervalHours: z.ZodOptional<z.ZodNumber>;
                excludedStreamPatterns: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../../../types").StreamsRouteHandlerResources, {
        success: true;
    }, undefined>;
};
