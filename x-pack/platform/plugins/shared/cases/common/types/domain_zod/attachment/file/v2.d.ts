import { z } from '@kbn/zod/v4';
export declare const FileAttachmentMetadataSchema: z.ZodObject<{
    files: z.ZodTuple<[z.ZodObject<{
        name: z.ZodString;
        extension: z.ZodString;
        mimeType: z.ZodString;
        created: z.ZodString;
    }, z.core.$strict>], null>;
    soType: z.ZodLiteral<"file">;
}, z.core.$strict>;
export type FileAttachmentMetadata = z.infer<typeof FileAttachmentMetadataSchema>;
export declare const FileAttachmentPayloadSchema: z.ZodObject<{
    type: z.ZodLiteral<"file">;
    owner: z.ZodString;
    attachmentId: z.ZodString;
    metadata: z.ZodObject<{
        files: z.ZodTuple<[z.ZodObject<{
            name: z.ZodString;
            extension: z.ZodString;
            mimeType: z.ZodString;
            created: z.ZodString;
        }, z.core.$strict>], null>;
        soType: z.ZodLiteral<"file">;
    }, z.core.$strict>;
}, z.core.$strict>;
export type FileAttachmentPayload = z.infer<typeof FileAttachmentPayloadSchema>;
