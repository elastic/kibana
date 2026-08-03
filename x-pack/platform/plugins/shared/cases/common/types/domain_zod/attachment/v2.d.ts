import { z } from '@kbn/zod/v4';
export declare const UnifiedReferenceAttachmentPayloadSchema: z.ZodObject<{
    type: z.ZodString;
    attachmentId: z.ZodString;
    owner: z.ZodString;
    data: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>>;
    metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>>;
}, z.core.$strip>;
export declare const UnifiedValueAttachmentPayloadSchema: z.ZodObject<{
    type: z.ZodString;
    data: z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>;
    owner: z.ZodString;
    metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>>;
}, z.core.$strip>;
export declare const UnifiedAttachmentPayloadSchema: z.ZodUnion<readonly [z.ZodObject<{
    type: z.ZodString;
    attachmentId: z.ZodString;
    owner: z.ZodString;
    data: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>>;
    metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodString;
    data: z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>;
    owner: z.ZodString;
    metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>>;
}, z.core.$strip>]>;
export declare const UnifiedAttachmentAttributesSchema: z.ZodIntersection<z.ZodUnion<readonly [z.ZodObject<{
    type: z.ZodString;
    attachmentId: z.ZodString;
    owner: z.ZodString;
    data: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>>;
    metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodString;
    data: z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>;
    owner: z.ZodString;
    metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>>;
}, z.core.$strip>]>, z.ZodObject<{
    created_at: z.ZodString;
    created_by: z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    owner: z.ZodString;
    pushed_at: z.ZodNullable<z.ZodString>;
    pushed_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    updated_at: z.ZodNullable<z.ZodString>;
    updated_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>>;
export declare const UnifiedAttachmentSchema: z.ZodIntersection<z.ZodIntersection<z.ZodUnion<readonly [z.ZodObject<{
    type: z.ZodString;
    attachmentId: z.ZodString;
    owner: z.ZodString;
    data: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>>;
    metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodString;
    data: z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>;
    owner: z.ZodString;
    metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>>;
}, z.core.$strip>]>, z.ZodObject<{
    created_at: z.ZodString;
    created_by: z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    owner: z.ZodString;
    pushed_at: z.ZodNullable<z.ZodString>;
    pushed_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    updated_at: z.ZodNullable<z.ZodString>;
    updated_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>>, z.ZodObject<{
    id: z.ZodString;
    version: z.ZodString;
}, z.core.$strip>>;
export declare const UnifiedAttachmentPatchAttributesSchema: z.ZodIntersection<z.ZodUnion<readonly [z.ZodObject<{
    type: z.ZodOptional<z.ZodString>;
    attachmentId: z.ZodOptional<z.ZodString>;
    data: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>>;
    metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodOptional<z.ZodString>;
    data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>;
    metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>>;
}, z.core.$strip>]>, z.ZodObject<{
    created_at: z.ZodOptional<z.ZodString>;
    created_by: z.ZodOptional<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    owner: z.ZodOptional<z.ZodString>;
    pushed_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    pushed_by: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    updated_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    updated_by: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
}, z.core.$strip>>;
export type UnifiedReferenceAttachmentPayload = z.infer<typeof UnifiedReferenceAttachmentPayloadSchema>;
export type UnifiedValueAttachmentPayload = z.infer<typeof UnifiedValueAttachmentPayloadSchema>;
export type UnifiedAttachmentPayload = z.infer<typeof UnifiedAttachmentPayloadSchema>;
export type UnifiedAttachmentAttributes = z.infer<typeof UnifiedAttachmentAttributesSchema>;
export type UnifiedAttachment = z.infer<typeof UnifiedAttachmentSchema>;
/**
 * Combined v1 legacy and v2 unified attachment types
 */
export declare const AttachmentSchemaV2: z.ZodUnion<readonly [z.ZodIntersection<z.ZodUnion<readonly [z.ZodObject<{
    comment: z.ZodString;
    type: z.ZodLiteral<import("./v1").AttachmentType.user>;
    created_at: z.ZodString;
    created_by: z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    owner: z.ZodString;
    pushed_at: z.ZodNullable<z.ZodString>;
    pushed_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    updated_at: z.ZodNullable<z.ZodString>;
    updated_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<import("./v1").AttachmentType.alert>;
    alertId: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>;
    index: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>;
    rule: z.ZodObject<{
        id: z.ZodNullable<z.ZodString>;
        name: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>;
    created_at: z.ZodString;
    created_by: z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    owner: z.ZodString;
    pushed_at: z.ZodNullable<z.ZodString>;
    pushed_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    updated_at: z.ZodNullable<z.ZodString>;
    updated_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<import("./v1").AttachmentType.event>;
    eventId: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>;
    index: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>;
    created_at: z.ZodString;
    created_by: z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    owner: z.ZodString;
    pushed_at: z.ZodNullable<z.ZodString>;
    pushed_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    updated_at: z.ZodNullable<z.ZodString>;
    updated_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<import("./v1").AttachmentType.actions>;
    comment: z.ZodString;
    actions: z.ZodObject<{
        targets: z.ZodArray<z.ZodObject<{
            hostname: z.ZodString;
            endpointId: z.ZodString;
        }, z.core.$strip>>;
        type: z.ZodString;
    }, z.core.$strip>;
    created_at: z.ZodString;
    created_by: z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    owner: z.ZodString;
    pushed_at: z.ZodNullable<z.ZodString>;
    pushed_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    updated_at: z.ZodNullable<z.ZodString>;
    updated_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodIntersection<z.ZodUnion<readonly [z.ZodObject<{
    externalReferenceAttachmentTypeId: z.ZodString;
    externalReferenceMetadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>;
    type: z.ZodLiteral<import("./v1").AttachmentType.externalReference>;
    owner: z.ZodString;
    externalReferenceId: z.ZodString;
    externalReferenceStorage: z.ZodObject<{
        type: z.ZodLiteral<import("./v1").ExternalReferenceStorageType.elasticSearchDoc>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    externalReferenceAttachmentTypeId: z.ZodString;
    externalReferenceMetadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>;
    type: z.ZodLiteral<import("./v1").AttachmentType.externalReference>;
    owner: z.ZodString;
    externalReferenceId: z.ZodString;
    externalReferenceStorage: z.ZodObject<{
        type: z.ZodLiteral<import("./v1").ExternalReferenceStorageType.savedObject>;
        soType: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>]>, z.ZodObject<{
    created_at: z.ZodString;
    created_by: z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    owner: z.ZodString;
    pushed_at: z.ZodNullable<z.ZodString>;
    pushed_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    updated_at: z.ZodNullable<z.ZodString>;
    updated_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>>, z.ZodObject<{
    type: z.ZodLiteral<import("./v1").AttachmentType.persistableState>;
    persistableStateAttachmentTypeId: z.ZodString;
    persistableStateAttachmentState: z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>;
    created_at: z.ZodString;
    created_by: z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    owner: z.ZodString;
    pushed_at: z.ZodNullable<z.ZodString>;
    pushed_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    updated_at: z.ZodNullable<z.ZodString>;
    updated_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>]>, z.ZodObject<{
    id: z.ZodString;
    version: z.ZodString;
}, z.core.$strip>>, z.ZodIntersection<z.ZodIntersection<z.ZodUnion<readonly [z.ZodObject<{
    type: z.ZodString;
    attachmentId: z.ZodString;
    owner: z.ZodString;
    data: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>>;
    metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodString;
    data: z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>;
    owner: z.ZodString;
    metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>>;
}, z.core.$strip>]>, z.ZodObject<{
    created_at: z.ZodString;
    created_by: z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    owner: z.ZodString;
    pushed_at: z.ZodNullable<z.ZodString>;
    pushed_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    updated_at: z.ZodNullable<z.ZodString>;
    updated_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>>, z.ZodObject<{
    id: z.ZodString;
    version: z.ZodString;
}, z.core.$strip>>]>;
export declare const AttachmentAttributesSchemaV2: z.ZodUnion<readonly [z.ZodUnion<readonly [z.ZodObject<{
    comment: z.ZodString;
    type: z.ZodLiteral<import("./v1").AttachmentType.user>;
    created_at: z.ZodString;
    created_by: z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    owner: z.ZodString;
    pushed_at: z.ZodNullable<z.ZodString>;
    pushed_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    updated_at: z.ZodNullable<z.ZodString>;
    updated_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<import("./v1").AttachmentType.alert>;
    alertId: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>;
    index: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>;
    rule: z.ZodObject<{
        id: z.ZodNullable<z.ZodString>;
        name: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>;
    created_at: z.ZodString;
    created_by: z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    owner: z.ZodString;
    pushed_at: z.ZodNullable<z.ZodString>;
    pushed_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    updated_at: z.ZodNullable<z.ZodString>;
    updated_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<import("./v1").AttachmentType.event>;
    eventId: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>;
    index: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>;
    created_at: z.ZodString;
    created_by: z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    owner: z.ZodString;
    pushed_at: z.ZodNullable<z.ZodString>;
    pushed_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    updated_at: z.ZodNullable<z.ZodString>;
    updated_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<import("./v1").AttachmentType.actions>;
    comment: z.ZodString;
    actions: z.ZodObject<{
        targets: z.ZodArray<z.ZodObject<{
            hostname: z.ZodString;
            endpointId: z.ZodString;
        }, z.core.$strip>>;
        type: z.ZodString;
    }, z.core.$strip>;
    created_at: z.ZodString;
    created_by: z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    owner: z.ZodString;
    pushed_at: z.ZodNullable<z.ZodString>;
    pushed_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    updated_at: z.ZodNullable<z.ZodString>;
    updated_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodIntersection<z.ZodUnion<readonly [z.ZodObject<{
    externalReferenceAttachmentTypeId: z.ZodString;
    externalReferenceMetadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>;
    type: z.ZodLiteral<import("./v1").AttachmentType.externalReference>;
    owner: z.ZodString;
    externalReferenceId: z.ZodString;
    externalReferenceStorage: z.ZodObject<{
        type: z.ZodLiteral<import("./v1").ExternalReferenceStorageType.elasticSearchDoc>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    externalReferenceAttachmentTypeId: z.ZodString;
    externalReferenceMetadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>;
    type: z.ZodLiteral<import("./v1").AttachmentType.externalReference>;
    owner: z.ZodString;
    externalReferenceId: z.ZodString;
    externalReferenceStorage: z.ZodObject<{
        type: z.ZodLiteral<import("./v1").ExternalReferenceStorageType.savedObject>;
        soType: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>]>, z.ZodObject<{
    created_at: z.ZodString;
    created_by: z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    owner: z.ZodString;
    pushed_at: z.ZodNullable<z.ZodString>;
    pushed_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    updated_at: z.ZodNullable<z.ZodString>;
    updated_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>>, z.ZodObject<{
    type: z.ZodLiteral<import("./v1").AttachmentType.persistableState>;
    persistableStateAttachmentTypeId: z.ZodString;
    persistableStateAttachmentState: z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>;
    created_at: z.ZodString;
    created_by: z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    owner: z.ZodString;
    pushed_at: z.ZodNullable<z.ZodString>;
    pushed_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    updated_at: z.ZodNullable<z.ZodString>;
    updated_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>]>, z.ZodIntersection<z.ZodUnion<readonly [z.ZodObject<{
    type: z.ZodString;
    attachmentId: z.ZodString;
    owner: z.ZodString;
    data: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>>;
    metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodString;
    data: z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>;
    owner: z.ZodString;
    metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>>;
}, z.core.$strip>]>, z.ZodObject<{
    created_at: z.ZodString;
    created_by: z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    owner: z.ZodString;
    pushed_at: z.ZodNullable<z.ZodString>;
    pushed_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    updated_at: z.ZodNullable<z.ZodString>;
    updated_by: z.ZodNullable<z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profile_uid: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>>]>;
export type AttachmentV2 = z.infer<typeof AttachmentSchemaV2>;
export type AttachmentAttributesV2 = z.infer<typeof AttachmentAttributesSchemaV2>;
