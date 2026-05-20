import { z } from '@kbn/zod/v4';
/** `state` shape is owned by the lens plugin; kept permissive to round-trip what lens persists. */
export declare const LensAttachmentDataSchema: z.ZodObject<{
    state: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strip>;
export type LensAttachmentData = z.infer<typeof LensAttachmentDataSchema>;
export declare const LensAttachmentPayloadSchema: z.ZodObject<{
    type: z.ZodLiteral<"lens">;
    owner: z.ZodString;
    data: z.ZodObject<{
        state: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, z.core.$strip>;
}, z.core.$strict>;
export type LensAttachmentPayload = z.infer<typeof LensAttachmentPayloadSchema>;
