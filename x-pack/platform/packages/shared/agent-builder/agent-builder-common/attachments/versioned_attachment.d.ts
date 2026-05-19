import { z } from '@kbn/zod/v4';
import type { AttachmentType, AttachmentDataOf } from './attachment_types';
/**
 * Represents a single version of an attachment's content.
 */
export interface AttachmentVersion<DataType = unknown> {
    /** Version number (starts at 1) */
    version: number;
    /** The attachment data for this version */
    data: DataType;
    /** When this version was created */
    created_at: string;
    /** Hash of the content for deduplication */
    content_hash: string;
    /** Estimated token count for LLM context management */
    estimated_tokens?: number;
}
/**
 * Represents a conversation-level versioned attachment.
 * Contains all versions of the attachment and metadata.
 */
export interface VersionedAttachment<Type extends string = string, DataType = Type extends AttachmentType ? AttachmentDataOf<Type> : unknown> {
    /** Unique identifier for the attachment */
    id: string;
    /** Type of the attachment */
    type: Type;
    /** Array of all versions (ordered by version number) */
    versions: AttachmentVersion<DataType>[];
    /** Current active version number */
    current_version: number;
    /** Human-readable description of the attachment */
    description?: string;
    /** Status of the attachment */
    active?: boolean;
    /** Whether the attachment should be hidden from the user */
    hidden?: boolean;
    /** Whether the attachment is read-only in this conversation */
    readonly?: boolean;
    /** The client-provided ID if this attachment was created with one (e.g., via flyout configuration) */
    client_id?: string;
    /**
     * Origin/reference info for attachments created from external sources.
     * For saved-object-backed types this is the saved object ID.
     * Undefined for by-value attachments.
     */
    origin?: string;
    /**
     * When this attachment's content was last captured from the origin (for by-reference attachments),
     * or when the attachment was stored.
     */
    origin_snapshot_at?: string;
}
/**
 * A versioned attachment with a defined `origin` (by-reference).
 */
export type VersionedAttachmentWithOrigin<Type extends string = string, DataType = Type extends AttachmentType ? AttachmentDataOf<Type> : unknown> = VersionedAttachment<Type, DataType> & {
    origin: string;
};
/**
 * Returns true when `origin` is defined. Narrows `attachment` to {@link VersionedAttachmentWithOrigin}.
 */
export declare function isVersionedAttachmentWithOrigin<Type extends string = string, DataType = Type extends AttachmentType ? AttachmentDataOf<Type> : unknown>(attachment: VersionedAttachment<Type, DataType>): attachment is VersionedAttachmentWithOrigin<Type, DataType>;
/**
 * Operation performed on an attachment during a round.
 */
export declare const ATTACHMENT_REF_OPERATION: {
    readonly read: "read";
    readonly created: "created";
    readonly updated: "updated";
    readonly deleted: "deleted";
    readonly restored: "restored";
};
export type AttachmentRefOperation = (typeof ATTACHMENT_REF_OPERATION)[keyof typeof ATTACHMENT_REF_OPERATION];
export declare const ATTACHMENT_REF_ACTOR: {
    readonly user: "user";
    readonly agent: "agent";
    readonly system: "system";
};
export type AttachmentRefActor = (typeof ATTACHMENT_REF_ACTOR)[keyof typeof ATTACHMENT_REF_ACTOR];
/**
 * Reference to a specific version of an attachment.
 * Used in RoundInput to reference conversation-level attachments.
 */
export interface AttachmentVersionRef {
    /** ID of the attachment being referenced */
    attachment_id: string;
    /** Version number being referenced */
    version: number;
    /** Operation performed on this attachment during the round */
    operation?: AttachmentRefOperation;
    /** Actor responsible for the operation during the round */
    actor?: AttachmentRefActor;
}
/**
 * Represents a diff between two versions of an attachment.
 */
export interface AttachmentDiff {
    /** Type of change between versions */
    change_type: 'create' | 'update' | 'delete' | 'restore';
    /** Human-readable summary of the change */
    summary: string;
    /** List of fields that changed (for updates) */
    changed_fields?: string[];
}
/**
 * Input for creating a new versioned attachment.
 */
export interface AttachmentInput<Type extends string = string, DataType = Type extends AttachmentType ? AttachmentDataOf<Type> : unknown> {
    /** Optional ID (will be generated if not provided) */
    id?: string;
    /** Type of the attachment */
    type: Type;
    /** The attachment data. Optional when `origin` is provided (content will be resolved). */
    data?: DataType;
    /** Origin/reference info for by-reference attachments (e.g., saved object ID). */
    origin?: string;
    /** Human-readable description */
    description?: string;
    /** Whether the attachment should be hidden */
    hidden?: boolean;
    /** Whether the attachment should be read-only */
    readonly?: boolean;
}
export declare const attachmentRefOperationSchema: z.ZodEnum<{
    read: "read";
    created: "created";
    updated: "updated";
    deleted: "deleted";
    restored: "restored";
}>;
export declare const attachmentRefActorSchema: z.ZodEnum<{
    agent: "agent";
    user: "user";
    system: "system";
}>;
export declare const attachmentVersionRefSchema: z.ZodObject<{
    attachment_id: z.ZodString;
    version: z.ZodNumber;
    operation: z.ZodOptional<z.ZodEnum<{
        read: "read";
        created: "created";
        updated: "updated";
        deleted: "deleted";
        restored: "restored";
    }>>;
    actor: z.ZodOptional<z.ZodEnum<{
        agent: "agent";
        user: "user";
        system: "system";
    }>>;
}, z.core.$strip>;
export declare const attachmentVersionSchema: z.ZodObject<{
    version: z.ZodNumber;
    data: z.ZodUnknown;
    created_at: z.ZodString;
    content_hash: z.ZodString;
    estimated_tokens: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const versionedAttachmentSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodString;
    versions: z.ZodArray<z.ZodObject<{
        version: z.ZodNumber;
        data: z.ZodUnknown;
        created_at: z.ZodString;
        content_hash: z.ZodString;
        estimated_tokens: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    current_version: z.ZodNumber;
    description: z.ZodOptional<z.ZodString>;
    active: z.ZodOptional<z.ZodBoolean>;
    hidden: z.ZodOptional<z.ZodBoolean>;
    readonly: z.ZodOptional<z.ZodBoolean>;
    client_id: z.ZodOptional<z.ZodString>;
    origin: z.ZodOptional<z.ZodString>;
    origin_snapshot_at: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const attachmentInputSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    type: z.ZodString;
    data: z.ZodOptional<z.ZodUnknown>;
    origin: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    hidden: z.ZodOptional<z.ZodBoolean>;
    readonly: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const attachmentDiffSchema: z.ZodObject<{
    change_type: z.ZodEnum<{
        update: "update";
        create: "create";
        delete: "delete";
        restore: "restore";
    }>;
    summary: z.ZodString;
    changed_fields: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
/**
 * Gets the latest (current) version of an attachment.
 */
export declare const getLatestVersion: <T = unknown>(attachment: VersionedAttachment<string, T>) => AttachmentVersion<T> | undefined;
/**
 * Gets a specific version of an attachment.
 */
export declare const getVersion: <T = unknown>(attachment: VersionedAttachment<string, T>, version: number) => AttachmentVersion<T> | undefined;
/**
 * Creates a unique identifier for a specific attachment version.
 */
export declare const createVersionId: (attachmentId: string, version: number) => string;
/**
 * Parses a version ID back into its components.
 */
export declare const parseVersionId: (versionId: string) => {
    attachmentId: string;
    version: number;
} | undefined;
/**
 * Checks if an attachment's current version is active (not deleted).
 */
export declare const isAttachmentActive: <T = unknown>(attachment: VersionedAttachment<string, T>) => boolean;
/**
 * Gets all active (non-deleted) attachments from a list.
 */
export declare const getActiveAttachments: <T = unknown>(attachments: VersionedAttachment<string, T>[]) => VersionedAttachment<string, T>[];
/**
 * Simple hash function for content deduplication.
 * Uses a basic string hash - suitable for detecting duplicates.
 */
export declare const hashContent: (data: unknown) => string;
/**
 * Estimates token count for attachment data.
 * Uses a simple heuristic: ~4 characters per token.
 */
export declare const estimateTokens: (data: unknown) => number;
/**
 * Response from the update origin API endpoint.
 */
export interface UpdateOriginResponse {
    success: boolean;
    attachment: VersionedAttachment;
}
/**
 * Builds a stable key for deduplicating or grouping attachment inputs (e.g. pending rows).
 */
export declare const getContentKey: (input: AttachmentInput, fallback: string) => string;
