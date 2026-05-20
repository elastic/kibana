import { z } from '@kbn/zod/v4';
import type { Attachment } from '../../../lib/streams/attachments/types';
export interface SuggestAttachmentsResponse {
    suggestions: Attachment[];
}
export declare const internalAttachmentRoutes: {
    "GET /internal/streams/{streamName}/attachments/_suggestions": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/streams/{streamName}/attachments/_suggestions", z.ZodObject<{
        path: z.ZodObject<{
            streamName: z.ZodString;
        }, z.core.$strip>;
        query: z.ZodOptional<z.ZodObject<{
            query: z.ZodOptional<z.ZodString>;
            attachmentTypes: z.ZodOptional<z.ZodUnion<readonly [z.ZodEnum<{
                rule: "rule";
                dashboard: "dashboard";
                slo: "slo";
            }>, z.ZodArray<z.ZodEnum<{
                rule: "rule";
                dashboard: "dashboard";
                slo: "slo";
            }>>]>>;
            tags: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>;
        }, z.core.$strip>>;
    }, z.core.$strip>, import("../../types").StreamsRouteHandlerResources, SuggestAttachmentsResponse, undefined>;
};
