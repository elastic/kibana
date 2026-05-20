import type { VersionedAttachment, AttachmentVersion, AttachmentVersionRef, AttachmentDiff, AttachmentInput, AttachmentRefActor, AttachmentStaleCheckResult } from '@kbn/agent-builder-common/attachments';
import type { AttachmentResolveContext, AttachmentTypeDefinition } from './type_definition';
/**
 * Input for updating an existing attachment.
 */
export interface AttachmentUpdateInput {
    /** New data for the attachment */
    data?: unknown;
    /** New description */
    description?: string;
    /** New hidden status */
    hidden?: boolean;
    /** New readonly status */
    readonly?: boolean;
}
/**
 * Result of resolving an attachment reference.
 */
export interface ResolvedAttachmentRef {
    /** The attachment ID */
    id: string;
    /** The attachment type */
    type: string;
    /** The version data */
    version: AttachmentVersion;
    /** Whether the attachment is currently active */
    active: boolean;
}
/**
 * Snapshot of an attachment at a specific version, returned by
 * {@link AttachmentStateManager.get}. Carries the attachment id, the
 * resolved version number, the type discriminator, and the version data.
 */
export interface AttachmentSnapshot {
    id: string;
    version: number;
    type: string;
    data: AttachmentVersion;
}
/**
 * Interface for managing conversation attachment state.
 * Provides CRUD operations with version tracking.
 */
export interface AttachmentStateManager {
    /** Get an attachment by ID. Returns the version data directly (no resolve). */
    get(id: string, options?: {
        actor?: AttachmentRefActor;
        version?: number;
    }): AttachmentSnapshot | undefined;
    /** Get the raw stored attachment record (all versions, metadata). */
    getAttachmentRecord(id: string): VersionedAttachment | undefined;
    /** Get all active (non-deleted) attachments */
    getActive(): VersionedAttachment[];
    /** Get all attachments (including deleted) */
    getAll(): VersionedAttachment[];
    /** Get diff between two versions of an attachment */
    getDiff(id: string, fromVersion: number, toVersion: number): AttachmentDiff | undefined;
    /** Add a new attachment. If only `origin` is provided (no `data`), resolves content via the type's resolve(). */
    add<TType extends string>(input: AttachmentInput<TType>, actor?: AttachmentRefActor, resolveContext?: AttachmentResolveContext): Promise<VersionedAttachment<TType>>;
    /** Update an existing attachment (creates new version if content changed) */
    update(id: string, input: AttachmentUpdateInput, actor?: AttachmentRefActor): Promise<VersionedAttachment | undefined>;
    /** Soft delete an attachment (sets active=false) */
    delete(id: string, actor?: AttachmentRefActor): boolean;
    /** Restore a deleted attachment (sets active=true) */
    restore(id: string, actor?: AttachmentRefActor): boolean;
    /** Permanently remove an attachment */
    permanentDelete(id: string): boolean;
    /** Update description without creating new version */
    rename(id: string, description: string, actor?: AttachmentRefActor): boolean;
    /** Update the origin reference for an attachment */
    updateOrigin(id: string, origin: string, actor?: AttachmentRefActor): Promise<boolean>;
    /** Evaluate staleness for all active attachments. Only attachments with origin are checked via the type's isStale; others are considered not stale. */
    evaluateStalenessForActiveAttachments(context: AttachmentResolveContext): Promise<AttachmentStaleCheckResult[]>;
    /** Get all attachment version refs that were accessed during this round */
    getAccessedRefs(): AttachmentVersionRef[];
    /** Clear the accessed refs tracking (call at start of new round) */
    clearAccessTracking(): void;
    /** Resolve attachment references to their actual data */
    resolveRefs(refs: AttachmentVersionRef[]): ResolvedAttachmentRef[];
    /** Get total estimated tokens for all active attachments */
    getTotalTokenEstimate(): number;
    /** Check if any changes have been made */
    hasChanges(): boolean;
    /** Reset the dirty flag (call after saving) */
    markClean(): void;
}
export interface CreateAttachmentStateManagerOptions {
    /**
     * Function to fetch the type definition from the attachment type registry.
     * Used to validate attachment data before storing it into conversation state.
     */
    getTypeDefinition: (type: string) => AttachmentTypeDefinition | undefined;
}
/**
 * Factory function to create an AttachmentStateManager.
 */
export declare const createAttachmentStateManager: (initialAttachments: VersionedAttachment[] | undefined, options: CreateAttachmentStateManagerOptions) => AttachmentStateManager;
