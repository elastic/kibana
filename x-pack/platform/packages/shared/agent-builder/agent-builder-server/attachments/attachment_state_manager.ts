/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  VersionedAttachment,
  AttachmentVersion,
  AttachmentVersionRef,
  AttachmentDiff,
  VersionedAttachmentInput,
  AttachmentType,
  AttachmentRefActor,
  AttachmentRefOperation,
} from '@kbn/agent-builder-common/attachments';
import {
  ATTACHMENT_REF_OPERATION,
  ATTACHMENT_REF_ACTOR,
} from '@kbn/agent-builder-common/attachments';
import {
  hashContent,
  estimateTokens,
  getLatestVersion,
  getVersion,
  isAttachmentActive,
} from '@kbn/agent-builder-common/attachments';
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
 * Interface for managing conversation attachment state.
 * Provides CRUD operations with version tracking.
 */
export interface AttachmentStateManager {
  /** Get an attachment by ID. Returns the version data directly (no resolve). */
  get(
    id: string,
    options?: {
      actor?: AttachmentRefActor;
      version?: number;
    }
  ):
    | {
        id: string;
        version: number;
        type: AttachmentType;
        data: AttachmentVersion;
      }
    | undefined;
  /** Get the raw stored attachment record (all versions, metadata). */
  getAttachmentRecord(id: string): VersionedAttachment | undefined;
  /** Get all active (non-deleted) attachments */
  getActive(): VersionedAttachment[];
  /** Get all attachments (including deleted) */
  getAll(): VersionedAttachment[];
  /** Get diff between two versions of an attachment */
  getDiff(id: string, fromVersion: number, toVersion: number): AttachmentDiff | undefined;

  /** Add a new attachment. If only `origin` is provided (no `data`), resolves content via the type's resolve(). */
  add<TType extends string>(
    input: VersionedAttachmentInput<TType>,
    actor?: AttachmentRefActor,
    resolveContext?: AttachmentResolveContext
  ): Promise<VersionedAttachment<TType>>;
  /** Update an existing attachment (creates new version if content changed) */
  update(
    id: string,
    input: AttachmentUpdateInput,
    actor?: AttachmentRefActor
  ): Promise<VersionedAttachment | undefined>;
  /** Soft delete an attachment (sets active=false) */
  delete(id: string, actor?: AttachmentRefActor): boolean;
  /** Restore a deleted attachment (sets active=true) */
  restore(id: string, actor?: AttachmentRefActor): boolean;
  /** Permanently remove an attachment */
  permanentDelete(id: string): boolean;
  /** Update description without creating new version */
  rename(id: string, description: string, actor?: AttachmentRefActor): boolean;

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
 * Private implementation of AttachmentStateManager.
 */
class AttachmentStateManagerImpl implements AttachmentStateManager {
  private attachments: Map<string, VersionedAttachment>;
  private dirty: boolean = false;
  private readonly options: CreateAttachmentStateManagerOptions;
  private accessedRefs: Map<string, AttachmentVersionRef> = new Map();

  constructor(
    initialAttachments: VersionedAttachment[] = [],
    options: CreateAttachmentStateManagerOptions
  ) {
    // Deep clone to avoid external mutation
    this.attachments = new Map();
    this.options = options;
    for (const attachment of initialAttachments) {
      const next = structuredClone(attachment);
      if (next.readonly === undefined) {
        next.readonly = this.getDefaultReadonly(next.type);
      }
      this.attachments.set(next.id, next);
    }
  }

  private getDefaultReadonly(type: string): boolean {
    const definition = this.options.getTypeDefinition(type);
    return definition?.isReadonly ?? true;
  }

  private async validateAttachmentData(type: string, data: unknown): Promise<unknown> {
    const typeDefinition = this.options.getTypeDefinition(type);
    if (!typeDefinition) {
      throw new Error(`Unknown attachment type: ${type}`);
    }

    try {
      const validationResult = await typeDefinition.validate(data);
      if (validationResult.valid) {
        return validationResult.data;
      }
      throw new Error(validationResult.error);
    } catch (e) {
      throw new Error(`Invalid attachment data for type "${type}": ${e.message}`);
    }
  }

  get(
    id: string,
    options?: {
      version?: number;
      actor?: AttachmentRefActor;
    }
  ) {
    const attachment = this.attachments.get(id);
    if (!attachment) {
      return undefined;
    }

    const version = options?.version ?? attachment.current_version;
    const attachmentVersion = getVersion(attachment, version);
    if (!attachmentVersion) {
      return undefined;
    }

    if (options?.actor) {
      this.recordAccess(id, version, ATTACHMENT_REF_OPERATION.read, options.actor);
    }

    return {
      id,
      version,
      type: attachment.type as AttachmentType,
      data: attachmentVersion,
    };
  }

  getAttachmentRecord(id: string): VersionedAttachment | undefined {
    return this.attachments.get(id);
  }

  getActive(): VersionedAttachment[] {
    return Array.from(this.attachments.values()).filter(isAttachmentActive);
  }

  getAll(): VersionedAttachment[] {
    return Array.from(this.attachments.values());
  }

  getDiff(id: string, fromVersion: number, toVersion: number): AttachmentDiff | undefined {
    const attachment = this.attachments.get(id);
    if (!attachment) {
      return undefined;
    }

    const fromVer = getVersion(attachment, fromVersion);
    const toVer = getVersion(attachment, toVersion);

    if (!fromVer || !toVer) {
      return undefined;
    }

    let changeType: AttachmentDiff['change_type'];
    let summary: string;
    const changedFields: string[] = [];

    if (fromVersion === 0 || !fromVer) {
      changeType = 'create';
      summary = `Created attachment "${attachment.description || attachment.id}"`;
    } else if (attachment.active === false && fromVersion < toVersion) {
      changeType = 'delete';
      summary = `Deleted attachment "${attachment.description || attachment.id}"`;
    } else if (attachment.active !== false && fromVersion < toVersion) {
      if (fromVer.content_hash !== toVer.content_hash) {
        changeType = 'update';
        summary = `Updated attachment "${attachment.description || attachment.id}"`;
        changedFields.push('data');
      } else {
        changeType = 'restore';
        summary = `Restored attachment "${attachment.description || attachment.id}"`;
      }
    } else {
      changeType = 'update';
      summary = `Updated attachment "${attachment.description || attachment.id}"`;
      if (fromVer.content_hash !== toVer.content_hash) {
        changedFields.push('data');
      }
    }

    return {
      change_type: changeType,
      summary,
      ...(changedFields.length > 0 && { changed_fields: changedFields }),
    };
  }

  async add<TType extends string>(
    input: VersionedAttachmentInput<TType>,
    actor?: AttachmentRefActor,
    resolveContext?: AttachmentResolveContext
  ): Promise<VersionedAttachment<TType>> {
    const id = input.id || uuidv4();
    const now = new Date().toISOString();

    let validatedData: unknown;

    if (input.data !== undefined) {
      validatedData = await this.validateAttachmentData(input.type, input.data);
    } else if (input.origin !== undefined) {
      const typeDefinition = this.options.getTypeDefinition(input.type);
      if (!typeDefinition) {
        throw new Error(`Unknown attachment type: ${input.type}`);
      }
      if (!typeDefinition.resolve) {
        throw new Error(`Attachment type "${input.type}" does not support resolving from origin`);
      }

      let validatedOrigin: unknown = input.origin;
      if (typeDefinition.validateOrigin) {
        const originResult = await typeDefinition.validateOrigin(input.origin);
        if (!originResult.valid) {
          throw new Error(`Invalid origin data for type "${input.type}": ${originResult.error}`);
        }
        validatedOrigin = originResult.data;
      }

      if (!resolveContext) {
        throw new Error(
          `Resolve context is required to add attachment of type "${input.type}" with origin`
        );
      }

      const resolved = await typeDefinition.resolve(validatedOrigin, resolveContext);
      if (resolved === undefined) {
        throw new Error(
          `Failed to resolve content from origin for attachment type "${input.type}"`
        );
      }
      validatedData = resolved;
    } else {
      throw new Error('Either data or origin must be provided when adding an attachment');
    }

    const contentHash = hashContent(validatedData);
    const tokens = estimateTokens(validatedData);

    const version: AttachmentVersion = {
      version: 1,
      data: validatedData,
      created_at: now,
      content_hash: contentHash,
      estimated_tokens: tokens,
    };

    const attachment: VersionedAttachment = {
      id,
      type: input.type,
      versions: [version],
      current_version: 1,
      active: true,
      ...(input.description && { description: input.description }),
      ...(input.hidden !== undefined && { hidden: input.hidden }),
      readonly: input.readonly ?? this.getDefaultReadonly(input.type),
      ...(input.origin !== undefined && { origin: input.origin }),
    };

    this.attachments.set(id, attachment);
    this.dirty = true;
    this.recordAccess(id, attachment.current_version, ATTACHMENT_REF_OPERATION.created, actor);

    return attachment as VersionedAttachment<TType>;
  }

  async update(
    id: string,
    input: AttachmentUpdateInput,
    actor?: AttachmentRefActor
  ): Promise<VersionedAttachment | undefined> {
    const attachment = this.attachments.get(id);
    if (!attachment) {
      return undefined;
    }

    if (attachment.active === false) {
      throw new Error(`Cannot update deleted attachment "${id}"`);
    }

    if (input.description !== undefined) {
      attachment.description = input.description;
      this.dirty = true;
    }
    if (input.hidden !== undefined) {
      attachment.hidden = input.hidden;
      this.dirty = true;
    }
    if (input.readonly !== undefined) {
      attachment.readonly = input.readonly;
      this.dirty = true;
    }

    if (input.data !== undefined) {
      const validatedData = await this.validateAttachmentData(attachment.type, input.data);
      const newHash = hashContent(validatedData);
      const currentVersion = getLatestVersion(attachment);

      // Only create new version if content actually changed
      if (!currentVersion || currentVersion.content_hash !== newHash) {
        const now = new Date().toISOString();
        const tokens = estimateTokens(validatedData);
        const newVersionNum = attachment.current_version + 1;

        const newVersion: AttachmentVersion = {
          version: newVersionNum,
          data: validatedData,
          created_at: now,
          content_hash: newHash,
          estimated_tokens: tokens,
        };

        attachment.versions.push(newVersion);
        attachment.current_version = newVersionNum;
        this.dirty = true;
      }
    }

    this.recordAccess(id, attachment.current_version, ATTACHMENT_REF_OPERATION.updated, actor);
    return attachment;
  }

  delete(id: string, actor?: AttachmentRefActor): boolean {
    const attachment = this.attachments.get(id);
    if (!attachment) {
      return false;
    }

    if (attachment.type === 'screen_context') {
      throw new Error(`Cannot delete screen_context attachment "${id}"`);
    }

    if (attachment.active === false) {
      return false;
    }

    attachment.active = false;
    this.dirty = true;
    this.recordAccess(id, attachment.current_version, ATTACHMENT_REF_OPERATION.deleted, actor);
    return true;
  }

  restore(id: string, actor?: AttachmentRefActor): boolean {
    const attachment = this.attachments.get(id);
    if (!attachment) {
      return false;
    }

    if (attachment.active !== false) {
      return false;
    }

    attachment.active = true;
    this.dirty = true;
    this.recordAccess(id, attachment.current_version, ATTACHMENT_REF_OPERATION.restored, actor);
    return true;
  }

  permanentDelete(id: string): boolean {
    if (!this.attachments.has(id)) {
      return false;
    }

    const attachment = this.attachments.get(id)!;
    if (attachment.type === 'screen_context') {
      throw new Error(`Cannot delete screen_context attachment "${id}"`);
    }

    this.attachments.delete(id);
    this.dirty = true;
    return true;
  }

  rename(id: string, description: string, actor?: AttachmentRefActor): boolean {
    const attachment = this.attachments.get(id);
    if (!attachment) {
      return false;
    }

    attachment.description = description;
    this.dirty = true;
    this.recordAccess(id, attachment.current_version, ATTACHMENT_REF_OPERATION.updated, actor);
    return true;
  }

  getAccessedRefs(): AttachmentVersionRef[] {
    return Array.from(this.accessedRefs.values());
  }

  clearAccessTracking(): void {
    this.accessedRefs.clear();
  }

  resolveRefs(refs: AttachmentVersionRef[]): ResolvedAttachmentRef[] {
    const results: ResolvedAttachmentRef[] = [];

    for (const ref of refs) {
      const attachment = this.attachments.get(ref.attachment_id);
      if (!attachment) {
        continue;
      }

      const version = getVersion(attachment, ref.version);
      if (!version) {
        continue;
      }

      results.push({
        id: attachment.id,
        type: attachment.type,
        version,
        active: isAttachmentActive(attachment),
      });
    }

    return results;
  }

  getTotalTokenEstimate(): number {
    let total = 0;
    for (const attachment of this.attachments.values()) {
      if (isAttachmentActive(attachment)) {
        const latest = getLatestVersion(attachment);
        if (latest?.estimated_tokens) {
          total += latest.estimated_tokens;
        }
      }
    }
    return total;
  }

  hasChanges(): boolean {
    return this.dirty;
  }

  markClean(): void {
    this.dirty = false;
  }

  private recordAccess(
    attachmentId: string,
    version: number,
    operation: AttachmentRefOperation,
    actor: AttachmentRefActor = ATTACHMENT_REF_ACTOR.system
  ): void {
    const key = `${attachmentId}:${version}:${actor}`;
    const existing = this.accessedRefs.get(key);
    if (!existing) {
      this.accessedRefs.set(key, { attachment_id: attachmentId, version, operation, actor });
      return;
    }

    if (existing.operation === ATTACHMENT_REF_OPERATION.created) {
      return;
    }

    if (operation === ATTACHMENT_REF_OPERATION.created) {
      this.accessedRefs.set(key, { attachment_id: attachmentId, version, operation, actor });
      return;
    }

    if (
      existing.operation === ATTACHMENT_REF_OPERATION.read &&
      operation !== ATTACHMENT_REF_OPERATION.read
    ) {
      this.accessedRefs.set(key, { attachment_id: attachmentId, version, operation, actor });
      return;
    }

    if (
      existing.operation === ATTACHMENT_REF_OPERATION.deleted &&
      operation === ATTACHMENT_REF_OPERATION.restored
    ) {
      this.accessedRefs.set(key, { attachment_id: attachmentId, version, operation, actor });
    }
  }
}

/**
 * Factory function to create an AttachmentStateManager.
 */
export const createAttachmentStateManager = (
  initialAttachments: VersionedAttachment[] = [],
  options: CreateAttachmentStateManagerOptions
): AttachmentStateManager => {
  return new AttachmentStateManagerImpl(initialAttachments, options);
};
