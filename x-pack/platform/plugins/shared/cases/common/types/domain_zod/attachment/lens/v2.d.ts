import { z } from '@kbn/zod/v4';
/** `state` shape is owned by the lens plugin; kept permissive to round-trip what lens persists. */
export declare const LensPersistableAttachmentDataSchema: z.ZodObject<{
    state: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strip>;
export type LensPersistableAttachmentData = z.infer<typeof LensPersistableAttachmentDataSchema>;
export declare const LensPersistableAttachmentPayloadSchema: z.ZodObject<{
    type: z.ZodLiteral<"lens">;
    owner: z.ZodString;
    data: z.ZodObject<{
        state: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, z.core.$strip>;
}, z.core.$strict>;
declare const LensSavedObjectAttributesSchema: z.ZodRecord<z.ZodString, z.ZodType<import("../../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../../schema_zod").JsonValue, unknown>>>;
export type LensSavedObjectAttributes = z.infer<typeof LensSavedObjectAttributesSchema>;
export declare const LensSavedObjectAttachmentDataSchema: z.ZodObject<{
    attributes: z.ZodRecord<z.ZodString, z.ZodType<import("../../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../../schema_zod").JsonValue, unknown>>>;
    timeRange: z.ZodOptional<z.ZodObject<{
        from: z.ZodString;
        to: z.ZodString;
        mode: z.ZodOptional<z.ZodEnum<{
            absolute: "absolute";
            relative: "relative";
        }>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type LensSavedObjectAttachmentData = z.infer<typeof LensSavedObjectAttachmentDataSchema>;
export type LensAttachmentData = LensPersistableAttachmentData | LensSavedObjectAttachmentData;
declare const LensSavedObjectAttachmentMetadataSchema: z.ZodObject<{
    title: z.ZodString;
    soType: z.ZodLiteral<"lens">;
}, z.core.$strict>;
export type LensSavedObjectAttachmentMetadata = z.infer<typeof LensSavedObjectAttachmentMetadataSchema>;
export declare const LensSavedObjectAttachmentPayloadSchema: z.ZodObject<{
    type: z.ZodLiteral<"lens">;
    owner: z.ZodString;
    attachmentId: z.ZodString;
    metadata: z.ZodObject<{
        title: z.ZodString;
        soType: z.ZodLiteral<"lens">;
    }, z.core.$strict>;
    data: z.ZodOptional<z.ZodObject<{
        attributes: z.ZodRecord<z.ZodString, z.ZodType<import("../../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../../schema_zod").JsonValue, unknown>>>;
        timeRange: z.ZodOptional<z.ZodObject<{
            from: z.ZodString;
            to: z.ZodString;
            mode: z.ZodOptional<z.ZodEnum<{
                absolute: "absolute";
                relative: "relative";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type LensSavedObjectAttachmentPayload = z.infer<typeof LensSavedObjectAttachmentPayloadSchema>;
export declare const LensAttachmentPayloadSchema: z.ZodUnion<readonly [z.ZodObject<{
    type: z.ZodLiteral<"lens">;
    owner: z.ZodString;
    data: z.ZodObject<{
        state: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, z.core.$strip>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"lens">;
    owner: z.ZodString;
    attachmentId: z.ZodString;
    metadata: z.ZodObject<{
        title: z.ZodString;
        soType: z.ZodLiteral<"lens">;
    }, z.core.$strict>;
    data: z.ZodOptional<z.ZodObject<{
        attributes: z.ZodRecord<z.ZodString, z.ZodType<import("../../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../../schema_zod").JsonValue, unknown>>>;
        timeRange: z.ZodOptional<z.ZodObject<{
            from: z.ZodString;
            to: z.ZodString;
            mode: z.ZodOptional<z.ZodEnum<{
                absolute: "absolute";
                relative: "relative";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
}, z.core.$strict>]>;
export type LensAttachmentPayload = z.infer<typeof LensAttachmentPayloadSchema>;
/**
 * Narrows a lens attachment `data` to the persistable arm. The saved-object
 * arm always carries `attributes` and never `state`, so we use the absence of
 * `attributes` together with the presence of `state` as a discriminator —
 * `state in data` alone would misclassify any future SO snapshot that happens
 * to expose a `state` key inside `attributes`.
 */
export declare const isLensPersistableData: (data: unknown) => data is LensPersistableAttachmentData;
export {};
