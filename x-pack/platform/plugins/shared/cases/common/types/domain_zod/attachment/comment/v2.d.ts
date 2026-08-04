import { z } from '@kbn/zod/v4';
export declare const CommentAttachmentDataSchema: z.ZodObject<{
    content: z.ZodString;
}, z.core.$strict>;
export type CommentAttachmentData = z.infer<typeof CommentAttachmentDataSchema>;
export declare const CommentAttachmentPayloadSchema: z.ZodObject<{
    type: z.ZodLiteral<"comment">;
    owner: z.ZodString;
    data: z.ZodObject<{
        content: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>;
export type CommentAttachmentPayload = z.infer<typeof CommentAttachmentPayloadSchema>;
