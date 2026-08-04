import { z } from '@kbn/zod/v4';
import { AttachmentType, ExternalReferenceStorageType } from '../../domain/attachment/v1';
export { AttachmentType, ExternalReferenceStorageType };
/**
 * Files
 */
export declare const SingleFileAttachmentMetadataSchema: z.ZodObject<{
    name: z.ZodString;
    extension: z.ZodString;
    mimeType: z.ZodString;
    created: z.ZodString;
}, z.core.$strip>;
export declare const FileAttachmentMetadataSchema: z.ZodObject<{
    files: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        extension: z.ZodString;
        mimeType: z.ZodString;
        created: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type FileAttachmentMetadata = z.infer<typeof FileAttachmentMetadataSchema>;
export declare const AttachmentAttributesBasicSchema: z.ZodObject<{
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
}, z.core.$strip>;
export declare const FileAttachmentMetadataPayloadSchema: z.ZodObject<{
    mimeType: z.ZodString;
    filename: z.ZodString;
}, z.core.$strip>;
/**
 * User comment
 */
export declare const UserCommentAttachmentPayloadSchema: z.ZodObject<{
    comment: z.ZodString;
    type: z.ZodLiteral<AttachmentType.user>;
    owner: z.ZodString;
}, z.core.$strip>;
declare const UserCommentAttachmentAttributesSchema: z.ZodObject<{
    comment: z.ZodString;
    type: z.ZodLiteral<AttachmentType.user>;
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
}, z.core.$strip>;
export declare const UserCommentAttachmentSchema: z.ZodObject<{
    comment: z.ZodString;
    type: z.ZodLiteral<AttachmentType.user>;
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
    id: z.ZodString;
    version: z.ZodString;
}, z.core.$strip>;
export type UserCommentAttachmentPayload = z.infer<typeof UserCommentAttachmentPayloadSchema>;
export type UserCommentAttachmentAttributes = z.infer<typeof UserCommentAttachmentAttributesSchema>;
export type UserCommentAttachment = z.infer<typeof UserCommentAttachmentSchema>;
/**
 * Generic event
 */
export declare const EventAttachmentPayloadSchema: z.ZodObject<{
    type: z.ZodLiteral<AttachmentType.event>;
    eventId: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>;
    index: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>;
    owner: z.ZodString;
}, z.core.$strip>;
/**
 * Alerts
 */
export declare const AlertAttachmentPayloadSchema: z.ZodObject<{
    type: z.ZodLiteral<AttachmentType.alert>;
    alertId: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>;
    index: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>;
    rule: z.ZodObject<{
        id: z.ZodNullable<z.ZodString>;
        name: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>;
    owner: z.ZodString;
}, z.core.$strip>;
export declare const AlertAttachmentAttributesSchema: z.ZodObject<{
    type: z.ZodLiteral<AttachmentType.alert>;
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
}, z.core.$strip>;
export declare const EventAttachmentAttributesSchema: z.ZodObject<{
    type: z.ZodLiteral<AttachmentType.event>;
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
}, z.core.$strip>;
export declare const AlertAttachmentSchema: z.ZodObject<{
    type: z.ZodLiteral<AttachmentType.alert>;
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
    id: z.ZodString;
    version: z.ZodString;
}, z.core.$strip>;
export declare const EventAttachmentSchema: z.ZodObject<{
    type: z.ZodLiteral<AttachmentType.event>;
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
    id: z.ZodString;
    version: z.ZodString;
}, z.core.$strip>;
export type AlertAttachmentPayload = z.infer<typeof AlertAttachmentPayloadSchema>;
export type AlertAttachmentAttributes = z.infer<typeof AlertAttachmentAttributesSchema>;
export type AlertAttachment = z.infer<typeof AlertAttachmentSchema>;
export type EventAttachmentPayload = z.infer<typeof EventAttachmentPayloadSchema>;
export type EventAttachmentAttributes = z.infer<typeof EventAttachmentAttributesSchema>;
export type EventAttachment = z.infer<typeof EventAttachmentSchema>;
export declare const DocumentAttachmentAttributesSchema: z.ZodUnion<readonly [z.ZodObject<{
    type: z.ZodLiteral<AttachmentType.alert>;
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
    type: z.ZodLiteral<AttachmentType.event>;
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
}, z.core.$strip>]>;
export type DocumentAttachmentAttributes = z.infer<typeof DocumentAttachmentAttributesSchema>;
/**
 * Actions
 */
export declare const ActionsAttachmentPayloadSchema: z.ZodObject<{
    type: z.ZodLiteral<AttachmentType.actions>;
    comment: z.ZodString;
    actions: z.ZodObject<{
        targets: z.ZodArray<z.ZodObject<{
            hostname: z.ZodString;
            endpointId: z.ZodString;
        }, z.core.$strip>>;
        type: z.ZodString;
    }, z.core.$strip>;
    owner: z.ZodString;
}, z.core.$strip>;
declare const ActionsAttachmentAttributesSchema: z.ZodObject<{
    type: z.ZodLiteral<AttachmentType.actions>;
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
}, z.core.$strip>;
export declare const ActionsAttachmentSchema: z.ZodObject<{
    type: z.ZodLiteral<AttachmentType.actions>;
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
    id: z.ZodString;
    version: z.ZodString;
}, z.core.$strip>;
export type ActionsAttachmentPayload = z.infer<typeof ActionsAttachmentPayloadSchema>;
export type ActionsAttachmentAttributes = z.infer<typeof ActionsAttachmentAttributesSchema>;
export type ActionsAttachment = z.infer<typeof ActionsAttachmentSchema>;
export declare const ExternalReferenceNoSOAttachmentPayloadSchema: z.ZodObject<{
    externalReferenceAttachmentTypeId: z.ZodString;
    externalReferenceMetadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>;
    type: z.ZodLiteral<AttachmentType.externalReference>;
    owner: z.ZodString;
    externalReferenceId: z.ZodString;
    externalReferenceStorage: z.ZodObject<{
        type: z.ZodLiteral<ExternalReferenceStorageType.elasticSearchDoc>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const ExternalReferenceSOAttachmentPayloadSchema: z.ZodObject<{
    externalReferenceAttachmentTypeId: z.ZodString;
    externalReferenceMetadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>;
    type: z.ZodLiteral<AttachmentType.externalReference>;
    owner: z.ZodString;
    externalReferenceId: z.ZodString;
    externalReferenceStorage: z.ZodObject<{
        type: z.ZodLiteral<ExternalReferenceStorageType.savedObject>;
        soType: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const ExternalReferenceSOWithoutRefsAttachmentPayloadSchema: z.ZodObject<{
    externalReferenceAttachmentTypeId: z.ZodString;
    externalReferenceMetadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>;
    type: z.ZodLiteral<AttachmentType.externalReference>;
    owner: z.ZodString;
    externalReferenceStorage: z.ZodObject<{
        type: z.ZodLiteral<ExternalReferenceStorageType.savedObject>;
        soType: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const ExternalReferenceAttachmentPayloadSchema: z.ZodUnion<readonly [z.ZodObject<{
    externalReferenceAttachmentTypeId: z.ZodString;
    externalReferenceMetadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>;
    type: z.ZodLiteral<AttachmentType.externalReference>;
    owner: z.ZodString;
    externalReferenceId: z.ZodString;
    externalReferenceStorage: z.ZodObject<{
        type: z.ZodLiteral<ExternalReferenceStorageType.elasticSearchDoc>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    externalReferenceAttachmentTypeId: z.ZodString;
    externalReferenceMetadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>;
    type: z.ZodLiteral<AttachmentType.externalReference>;
    owner: z.ZodString;
    externalReferenceId: z.ZodString;
    externalReferenceStorage: z.ZodObject<{
        type: z.ZodLiteral<ExternalReferenceStorageType.savedObject>;
        soType: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>]>;
export declare const ExternalReferenceWithoutRefsAttachmentPayloadSchema: z.ZodUnion<readonly [z.ZodObject<{
    externalReferenceAttachmentTypeId: z.ZodString;
    externalReferenceMetadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>;
    type: z.ZodLiteral<AttachmentType.externalReference>;
    owner: z.ZodString;
    externalReferenceId: z.ZodString;
    externalReferenceStorage: z.ZodObject<{
        type: z.ZodLiteral<ExternalReferenceStorageType.elasticSearchDoc>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    externalReferenceAttachmentTypeId: z.ZodString;
    externalReferenceMetadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>;
    type: z.ZodLiteral<AttachmentType.externalReference>;
    owner: z.ZodString;
    externalReferenceStorage: z.ZodObject<{
        type: z.ZodLiteral<ExternalReferenceStorageType.savedObject>;
        soType: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>]>;
declare const ExternalReferenceAttachmentAttributesSchema: z.ZodIntersection<z.ZodUnion<readonly [z.ZodObject<{
    externalReferenceAttachmentTypeId: z.ZodString;
    externalReferenceMetadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>;
    type: z.ZodLiteral<AttachmentType.externalReference>;
    owner: z.ZodString;
    externalReferenceId: z.ZodString;
    externalReferenceStorage: z.ZodObject<{
        type: z.ZodLiteral<ExternalReferenceStorageType.elasticSearchDoc>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    externalReferenceAttachmentTypeId: z.ZodString;
    externalReferenceMetadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>;
    type: z.ZodLiteral<AttachmentType.externalReference>;
    owner: z.ZodString;
    externalReferenceId: z.ZodString;
    externalReferenceStorage: z.ZodObject<{
        type: z.ZodLiteral<ExternalReferenceStorageType.savedObject>;
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
}, z.core.$strip>>;
declare const ExternalReferenceNoSOAttachmentAttributesSchema: z.ZodObject<{
    externalReferenceAttachmentTypeId: z.ZodString;
    externalReferenceMetadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>;
    type: z.ZodLiteral<AttachmentType.externalReference>;
    externalReferenceId: z.ZodString;
    externalReferenceStorage: z.ZodObject<{
        type: z.ZodLiteral<ExternalReferenceStorageType.elasticSearchDoc>;
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
}, z.core.$strip>;
declare const ExternalReferenceSOAttachmentAttributesSchema: z.ZodObject<{
    externalReferenceAttachmentTypeId: z.ZodString;
    externalReferenceMetadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>;
    type: z.ZodLiteral<AttachmentType.externalReference>;
    externalReferenceId: z.ZodString;
    externalReferenceStorage: z.ZodObject<{
        type: z.ZodLiteral<ExternalReferenceStorageType.savedObject>;
        soType: z.ZodString;
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
}, z.core.$strip>;
export declare const ExternalReferenceAttachmentSchema: z.ZodIntersection<z.ZodIntersection<z.ZodUnion<readonly [z.ZodObject<{
    externalReferenceAttachmentTypeId: z.ZodString;
    externalReferenceMetadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>;
    type: z.ZodLiteral<AttachmentType.externalReference>;
    owner: z.ZodString;
    externalReferenceId: z.ZodString;
    externalReferenceStorage: z.ZodObject<{
        type: z.ZodLiteral<ExternalReferenceStorageType.elasticSearchDoc>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    externalReferenceAttachmentTypeId: z.ZodString;
    externalReferenceMetadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>;
    type: z.ZodLiteral<AttachmentType.externalReference>;
    owner: z.ZodString;
    externalReferenceId: z.ZodString;
    externalReferenceStorage: z.ZodObject<{
        type: z.ZodLiteral<ExternalReferenceStorageType.savedObject>;
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
    id: z.ZodString;
    version: z.ZodString;
}, z.core.$strip>>;
export type ExternalReferenceAttachmentPayload = z.infer<typeof ExternalReferenceAttachmentPayloadSchema>;
export type ExternalReferenceSOAttachmentPayload = z.infer<typeof ExternalReferenceSOAttachmentPayloadSchema>;
export type ExternalReferenceNoSOAttachmentPayload = z.infer<typeof ExternalReferenceNoSOAttachmentPayloadSchema>;
export type ExternalReferenceAttachmentAttributes = z.infer<typeof ExternalReferenceAttachmentAttributesSchema>;
export type ExternalReferenceSOAttachmentAttributes = z.infer<typeof ExternalReferenceSOAttachmentAttributesSchema>;
export type ExternalReferenceNoSOAttachmentAttributes = z.infer<typeof ExternalReferenceNoSOAttachmentAttributesSchema>;
export type ExternalReferenceWithoutRefsAttachmentPayload = z.infer<typeof ExternalReferenceWithoutRefsAttachmentPayloadSchema>;
export type ExternalReferenceAttachment = z.infer<typeof ExternalReferenceAttachmentSchema>;
/**
 * Persistable state
 */
export declare const PersistableStateAttachmentPayloadSchema: z.ZodObject<{
    type: z.ZodLiteral<AttachmentType.persistableState>;
    owner: z.ZodString;
    persistableStateAttachmentTypeId: z.ZodString;
    persistableStateAttachmentState: z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>;
}, z.core.$strip>;
declare const PersistableStateAttachmentAttributesSchema: z.ZodObject<{
    type: z.ZodLiteral<AttachmentType.persistableState>;
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
}, z.core.$strip>;
export declare const PersistableStateAttachmentSchema: z.ZodObject<{
    type: z.ZodLiteral<AttachmentType.persistableState>;
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
    id: z.ZodString;
    version: z.ZodString;
}, z.core.$strip>;
export type PersistableStateAttachmentPayload = z.infer<typeof PersistableStateAttachmentPayloadSchema>;
export type PersistableStateAttachment = z.infer<typeof PersistableStateAttachmentSchema>;
export type PersistableStateAttachmentAttributes = z.infer<typeof PersistableStateAttachmentAttributesSchema>;
/**
 * Common
 */
export declare const AttachmentPayloadSchema: z.ZodUnion<readonly [z.ZodObject<{
    comment: z.ZodString;
    type: z.ZodLiteral<AttachmentType.user>;
    owner: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<AttachmentType.alert>;
    alertId: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>;
    index: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>;
    rule: z.ZodObject<{
        id: z.ZodNullable<z.ZodString>;
        name: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>;
    owner: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<AttachmentType.event>;
    eventId: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>;
    index: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>;
    owner: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<AttachmentType.actions>;
    comment: z.ZodString;
    actions: z.ZodObject<{
        targets: z.ZodArray<z.ZodObject<{
            hostname: z.ZodString;
            endpointId: z.ZodString;
        }, z.core.$strip>>;
        type: z.ZodString;
    }, z.core.$strip>;
    owner: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    externalReferenceAttachmentTypeId: z.ZodString;
    externalReferenceMetadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>;
    type: z.ZodLiteral<AttachmentType.externalReference>;
    owner: z.ZodString;
    externalReferenceId: z.ZodString;
    externalReferenceStorage: z.ZodObject<{
        type: z.ZodLiteral<ExternalReferenceStorageType.elasticSearchDoc>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    externalReferenceAttachmentTypeId: z.ZodString;
    externalReferenceMetadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>;
    type: z.ZodLiteral<AttachmentType.externalReference>;
    owner: z.ZodString;
    externalReferenceId: z.ZodString;
    externalReferenceStorage: z.ZodObject<{
        type: z.ZodLiteral<ExternalReferenceStorageType.savedObject>;
        soType: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<AttachmentType.persistableState>;
    owner: z.ZodString;
    persistableStateAttachmentTypeId: z.ZodString;
    persistableStateAttachmentState: z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>;
}, z.core.$strip>]>;
export declare const AttachmentAttributesSchema: z.ZodUnion<readonly [z.ZodObject<{
    comment: z.ZodString;
    type: z.ZodLiteral<AttachmentType.user>;
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
    type: z.ZodLiteral<AttachmentType.alert>;
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
    type: z.ZodLiteral<AttachmentType.event>;
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
    type: z.ZodLiteral<AttachmentType.actions>;
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
    type: z.ZodLiteral<AttachmentType.externalReference>;
    owner: z.ZodString;
    externalReferenceId: z.ZodString;
    externalReferenceStorage: z.ZodObject<{
        type: z.ZodLiteral<ExternalReferenceStorageType.elasticSearchDoc>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    externalReferenceAttachmentTypeId: z.ZodString;
    externalReferenceMetadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>;
    type: z.ZodLiteral<AttachmentType.externalReference>;
    owner: z.ZodString;
    externalReferenceId: z.ZodString;
    externalReferenceStorage: z.ZodObject<{
        type: z.ZodLiteral<ExternalReferenceStorageType.savedObject>;
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
    type: z.ZodLiteral<AttachmentType.persistableState>;
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
}, z.core.$strip>]>;
declare const AttachmentAttributesNoSOSchema: z.ZodUnion<readonly [z.ZodObject<{
    comment: z.ZodString;
    type: z.ZodLiteral<AttachmentType.user>;
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
    type: z.ZodLiteral<AttachmentType.alert>;
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
    type: z.ZodLiteral<AttachmentType.event>;
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
    type: z.ZodLiteral<AttachmentType.actions>;
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
}, z.core.$strip>, z.ZodObject<{
    externalReferenceAttachmentTypeId: z.ZodString;
    externalReferenceMetadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>;
    type: z.ZodLiteral<AttachmentType.externalReference>;
    externalReferenceId: z.ZodString;
    externalReferenceStorage: z.ZodObject<{
        type: z.ZodLiteral<ExternalReferenceStorageType.elasticSearchDoc>;
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
    type: z.ZodLiteral<AttachmentType.persistableState>;
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
}, z.core.$strip>]>;
declare const AttachmentAttributesWithoutRefsSchema: z.ZodUnion<readonly [z.ZodObject<{
    comment: z.ZodString;
    type: z.ZodLiteral<AttachmentType.user>;
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
    type: z.ZodLiteral<AttachmentType.alert>;
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
    type: z.ZodLiteral<AttachmentType.event>;
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
    type: z.ZodLiteral<AttachmentType.actions>;
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
    type: z.ZodLiteral<AttachmentType.externalReference>;
    owner: z.ZodString;
    externalReferenceId: z.ZodString;
    externalReferenceStorage: z.ZodObject<{
        type: z.ZodLiteral<ExternalReferenceStorageType.elasticSearchDoc>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    externalReferenceAttachmentTypeId: z.ZodString;
    externalReferenceMetadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>;
    type: z.ZodLiteral<AttachmentType.externalReference>;
    owner: z.ZodString;
    externalReferenceStorage: z.ZodObject<{
        type: z.ZodLiteral<ExternalReferenceStorageType.savedObject>;
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
    type: z.ZodLiteral<AttachmentType.persistableState>;
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
}, z.core.$strip>]>;
export declare const AttachmentSchema: z.ZodIntersection<z.ZodUnion<readonly [z.ZodObject<{
    comment: z.ZodString;
    type: z.ZodLiteral<AttachmentType.user>;
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
    type: z.ZodLiteral<AttachmentType.alert>;
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
    type: z.ZodLiteral<AttachmentType.event>;
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
    type: z.ZodLiteral<AttachmentType.actions>;
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
    type: z.ZodLiteral<AttachmentType.externalReference>;
    owner: z.ZodString;
    externalReferenceId: z.ZodString;
    externalReferenceStorage: z.ZodObject<{
        type: z.ZodLiteral<ExternalReferenceStorageType.elasticSearchDoc>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    externalReferenceAttachmentTypeId: z.ZodString;
    externalReferenceMetadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>;
    type: z.ZodLiteral<AttachmentType.externalReference>;
    owner: z.ZodString;
    externalReferenceId: z.ZodString;
    externalReferenceStorage: z.ZodObject<{
        type: z.ZodLiteral<ExternalReferenceStorageType.savedObject>;
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
    type: z.ZodLiteral<AttachmentType.persistableState>;
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
}, z.core.$strip>>;
export declare const AttachmentsSchema: z.ZodArray<z.ZodIntersection<z.ZodUnion<readonly [z.ZodObject<{
    comment: z.ZodString;
    type: z.ZodLiteral<AttachmentType.user>;
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
    type: z.ZodLiteral<AttachmentType.alert>;
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
    type: z.ZodLiteral<AttachmentType.event>;
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
    type: z.ZodLiteral<AttachmentType.actions>;
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
    type: z.ZodLiteral<AttachmentType.externalReference>;
    owner: z.ZodString;
    externalReferenceId: z.ZodString;
    externalReferenceStorage: z.ZodObject<{
        type: z.ZodLiteral<ExternalReferenceStorageType.elasticSearchDoc>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    externalReferenceAttachmentTypeId: z.ZodString;
    externalReferenceMetadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>;
    type: z.ZodLiteral<AttachmentType.externalReference>;
    owner: z.ZodString;
    externalReferenceId: z.ZodString;
    externalReferenceStorage: z.ZodObject<{
        type: z.ZodLiteral<ExternalReferenceStorageType.savedObject>;
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
    type: z.ZodLiteral<AttachmentType.persistableState>;
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
}, z.core.$strip>>>;
export declare const AttachmentPatchAttributesSchema: z.ZodIntersection<z.ZodUnion<readonly [z.ZodObject<{
    comment: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodLiteral<AttachmentType.user>>;
    owner: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodOptional<z.ZodLiteral<AttachmentType.alert>>;
    alertId: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>>;
    index: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>>;
    rule: z.ZodOptional<z.ZodObject<{
        id: z.ZodNullable<z.ZodString>;
        name: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
    owner: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodOptional<z.ZodLiteral<AttachmentType.event>>;
    eventId: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>>;
    index: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodString]>>;
    owner: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodOptional<z.ZodLiteral<AttachmentType.actions>>;
    comment: z.ZodOptional<z.ZodString>;
    actions: z.ZodOptional<z.ZodObject<{
        targets: z.ZodArray<z.ZodObject<{
            hostname: z.ZodString;
            endpointId: z.ZodString;
        }, z.core.$strip>>;
        type: z.ZodString;
    }, z.core.$strip>>;
    owner: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    externalReferenceAttachmentTypeId: z.ZodOptional<z.ZodString>;
    externalReferenceMetadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>>;
    type: z.ZodOptional<z.ZodLiteral<AttachmentType.externalReference>>;
    owner: z.ZodOptional<z.ZodString>;
    externalReferenceId: z.ZodOptional<z.ZodString>;
    externalReferenceStorage: z.ZodOptional<z.ZodObject<{
        type: z.ZodLiteral<ExternalReferenceStorageType.elasticSearchDoc>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    externalReferenceAttachmentTypeId: z.ZodOptional<z.ZodString>;
    externalReferenceMetadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>>;
    type: z.ZodOptional<z.ZodLiteral<AttachmentType.externalReference>>;
    owner: z.ZodOptional<z.ZodString>;
    externalReferenceId: z.ZodOptional<z.ZodString>;
    externalReferenceStorage: z.ZodOptional<z.ZodObject<{
        type: z.ZodLiteral<ExternalReferenceStorageType.savedObject>;
        soType: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodOptional<z.ZodLiteral<AttachmentType.persistableState>>;
    owner: z.ZodOptional<z.ZodString>;
    persistableStateAttachmentTypeId: z.ZodOptional<z.ZodString>;
    persistableStateAttachmentState: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<import("../../../schema_zod").JsonValue, unknown, z.core.$ZodTypeInternals<import("../../../schema_zod").JsonValue, unknown>>>>;
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
export type AttachmentAttributes = z.infer<typeof AttachmentAttributesSchema>;
export type AttachmentAttributesNoSO = z.infer<typeof AttachmentAttributesNoSOSchema>;
export type AttachmentAttributesWithoutRefs = z.infer<typeof AttachmentAttributesWithoutRefsSchema>;
export type AttachmentPatchAttributes = z.infer<typeof AttachmentPatchAttributesSchema>;
export type Attachment = z.infer<typeof AttachmentSchema>;
export type Attachments = z.infer<typeof AttachmentsSchema>;
