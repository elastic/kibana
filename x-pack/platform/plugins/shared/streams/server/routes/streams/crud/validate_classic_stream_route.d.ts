import { z } from '@kbn/zod/v4';
export declare const validateClassicStreamRoute: Record<"POST /internal/streams/_validate_classic_stream", import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/streams/_validate_classic_stream", z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        selectedTemplateName: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, {
    isValid: boolean;
    errorType: "duplicate";
    conflictingIndexPattern?: undefined;
} | {
    isValid: boolean;
    errorType: "higherPriority";
    conflictingIndexPattern: string;
} | {
    isValid: boolean;
    errorType: null;
    conflictingIndexPattern?: undefined;
}, undefined>>;
