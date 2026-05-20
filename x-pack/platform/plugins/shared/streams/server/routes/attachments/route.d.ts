import type { z } from '@kbn/zod/v4';
import type { Attachment } from '../../lib/streams/attachments/types';
export interface ListAttachmentsResponse {
    attachments: Attachment[];
}
export interface LinkAttachmentResponse {
    acknowledged: boolean;
}
export interface UnlinkAttachmentResponse {
    acknowledged: boolean;
}
export interface BulkUpdateAttachmentsResponse {
    acknowledged: boolean;
}
export declare const attachmentRoutes: {
    "POST /api/streams/{streamName}/attachments/_bulk 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/streams/{streamName}/attachments/_bulk 2023-10-31", z.ZodObject<{
        path: z.ZodObject<{
            streamName: z.ZodString;
        }, z.core.$strip>;
        body: z.ZodObject<{
            operations: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
                index: z.ZodObject<{
                    id: z.ZodString;
                    type: z.ZodEnum<{
                        rule: "rule";
                        dashboard: "dashboard";
                        slo: "slo";
                    }>;
                }, z.core.$strip>;
            }, z.core.$strip>, z.ZodObject<{
                delete: z.ZodObject<{
                    id: z.ZodString;
                    type: z.ZodEnum<{
                        rule: "rule";
                        dashboard: "dashboard";
                        slo: "slo";
                    }>;
                }, z.core.$strip>;
            }, z.core.$strip>]>>;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../types").StreamsRouteHandlerResources, BulkUpdateAttachmentsResponse, undefined>;
    "DELETE /api/streams/{streamName}/attachments/{attachmentType}/{attachmentId} 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"DELETE /api/streams/{streamName}/attachments/{attachmentType}/{attachmentId} 2023-10-31", z.ZodObject<{
        path: z.ZodObject<{
            streamName: z.ZodString;
            attachmentType: z.ZodEnum<{
                rule: "rule";
                dashboard: "dashboard";
                slo: "slo";
            }>;
            attachmentId: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../types").StreamsRouteHandlerResources, UnlinkAttachmentResponse, undefined>;
    "PUT /api/streams/{streamName}/attachments/{attachmentType}/{attachmentId} 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"PUT /api/streams/{streamName}/attachments/{attachmentType}/{attachmentId} 2023-10-31", z.ZodObject<{
        path: z.ZodObject<{
            streamName: z.ZodString;
            attachmentType: z.ZodEnum<{
                rule: "rule";
                dashboard: "dashboard";
                slo: "slo";
            }>;
            attachmentId: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>, import("../types").StreamsRouteHandlerResources, LinkAttachmentResponse, undefined>;
    "GET /api/streams/{streamName}/attachments 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/streams/{streamName}/attachments 2023-10-31", z.ZodObject<{
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
    }, z.core.$strip>, import("../types").StreamsRouteHandlerResources, ListAttachmentsResponse, undefined>;
};
