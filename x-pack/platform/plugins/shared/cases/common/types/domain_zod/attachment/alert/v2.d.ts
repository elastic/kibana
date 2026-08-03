import { z } from '@kbn/zod/v4';
/**
 * Shared metadata shape for alert attachments (stack / security / observability).
 * `index` may be a scalar or array because legacy alert payloads supported both,
 * and `rule` is optional/null for cross-tenant or rule-less alerts.
 */
export declare const AlertAttachmentMetadataSchema: z.ZodObject<{
    index: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>;
    rule: z.ZodOptional<z.ZodUnion<readonly [z.ZodNull, z.ZodObject<{
        id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strict>]>>;
}, z.core.$strict>;
export type AlertAttachmentMetadata = z.infer<typeof AlertAttachmentMetadataSchema>;
/**
 * Build a full-payload schema for a specific alert subtype. Each consumer
 * (`stack.alert`, `security.alert`, `observability.alert`) wires its own
 * `type` literal so unknown subtypes are rejected at registration time.
 *
 * `metadata` is `.optional()` rather than `nullable` so the inferred type stays
 * `Metadata | undefined`; the renderer doesn't need to discriminate `null` vs
 * `undefined`, and real writers never persist `metadata: null` for alerts.
 */
export declare const buildAlertAttachmentPayloadSchema: <T extends string>(typeLiteral: T) => z.ZodObject<{
    type: z.ZodLiteral<T>;
    owner: z.ZodString;
    attachmentId: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>;
    metadata: z.ZodOptional<z.ZodObject<{
        index: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>;
        rule: z.ZodOptional<z.ZodUnion<readonly [z.ZodNull, z.ZodObject<{
            id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strict>]>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const StackAlertAttachmentPayloadSchema: z.ZodObject<{
    type: z.ZodLiteral<"stack.alert">;
    owner: z.ZodString;
    attachmentId: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>;
    metadata: z.ZodOptional<z.ZodObject<{
        index: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>;
        rule: z.ZodOptional<z.ZodUnion<readonly [z.ZodNull, z.ZodObject<{
            id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strict>]>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type StackAlertAttachmentPayload = z.infer<typeof StackAlertAttachmentPayloadSchema>;
