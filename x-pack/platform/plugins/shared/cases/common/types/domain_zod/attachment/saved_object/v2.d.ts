import { z } from '@kbn/zod/v4';
export interface SavedObjectReferenceMetadata {
    title: string;
    soType: string;
}
export declare const TimeRangeSchema: z.ZodObject<{
    from: z.ZodString;
    to: z.ZodString;
    mode: z.ZodOptional<z.ZodEnum<{
        absolute: "absolute";
        relative: "relative";
    }>>;
}, z.core.$strict>;
export declare const buildSavedObjectMetadataSchema: <SoType extends string>(soType: SoType) => z.ZodObject<{
    title: z.ZodString;
    soType: z.ZodLiteral<SoType>;
}, z.core.$strict>;
/**
 * Reference-typed payload schemas for general saved-object attachments. Each
 * payload carries the SO id in `attachmentId`, plus title and `soType` in
 * metadata.
 */
export declare const buildSavedObjectPayloadSchema: <AttachmentType extends string, SoType extends string>(attachmentType: AttachmentType, soType: SoType) => z.ZodObject<{
    type: z.ZodLiteral<AttachmentType>;
    owner: z.ZodString;
    attachmentId: z.ZodString;
    metadata: z.ZodObject<{
        title: z.ZodString;
        soType: z.ZodLiteral<SoType>;
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const DiscoverSessionAttachmentPayloadSchema: z.ZodObject<{
    type: z.ZodLiteral<"discoverSession">;
    owner: z.ZodString;
    attachmentId: z.ZodString;
    metadata: z.ZodObject<{
        title: z.ZodString;
        soType: z.ZodLiteral<"search">;
    }, z.core.$strict>;
}, z.core.$strict>;
export type DiscoverSessionAttachmentPayload = z.infer<typeof DiscoverSessionAttachmentPayloadSchema>;
