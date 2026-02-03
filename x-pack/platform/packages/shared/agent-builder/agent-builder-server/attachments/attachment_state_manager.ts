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
} from '@kbn/agent-builder-common/attachments';
import {
  hashContent,
  estimateTokens,
  getLatestVersion,
  getVersion,
  isAttachmentActive,
} from '@kbn/agent-builder-common/attachments';
import type { AttachmentTypeDefinition } from './type_definition';

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
  /** Get an attachment by ID */
  get(id: string): VersionedAttachment | undefined;
  /** Get the latest version of an attachment */
  getLatest(id: string): AttachmentVersion | undefined;
  /** Get a specific version of an attachment */
  getVersion(id: string, version: number): AttachmentVersion | undefined;
  /** Get all active (non-deleted) attachments */
  getActive(): VersionedAttachment[];
  /** Get all attachments (including deleted) */
  getAll(): VersionedAttachment[];
  /** Get diff between two versions of an attachment */
  getDiff(id: string, fromVersion: number, toVersion: number): AttachmentDiff | undefined;

  /** Add a new attachment */
  add<TType extends string>(
    input: VersionedAttachmentInput<TType>
  ): Promise<VersionedAttachment<TType>>;
  /** Update an existing attachment (creates new version if content changed) */
  update(id: string, input: AttachmentUpdateInput): Promise<VersionedAttachment | undefined>;
  /** Soft delete an attachment (sets active=false) */
  delete(id: string): boolean;
  /** Restore a deleted attachment (sets active=true) */
  restore(id: string): boolean;
  /** Permanently remove an attachment */
  permanentDelete(id: string): boolean;
  /** Update description without creating new version */
  rename(id: string, description: string): boolean;

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

  constructor(
    initialAttachments: VersionedAttachment[] = [],
    options: CreateAttachmentStateManagerOptions
  ) {
    // Deep clone to avoid external mutation
    this.attachments = new Map();
    this.options = options;
    for (const attachment of initialAttachments) {
      this.attachments.set(attachment.id, structuredClone(attachment));
    }
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

  get(id: string): VersionedAttachment | undefined {
    return this.attachments.get(id);
  }

  getLatest(id: string): AttachmentVersion | undefined {
    const attachment = this.attachments.get(id);
    if (!attachment) {
      return undefined;
    }
    return getLatestVersion(attachment);
  }

  getVersion(id: string, version: number): AttachmentVersion | undefined {
    const attachment = this.attachments.get(id);
    if (!attachment) {
      return undefined;
    }
    return getVersion(attachment, version);
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
    input: VersionedAttachmentInput<TType>
  ): Promise<VersionedAttachment<TType>> {
    const id = input.id || uuidv4();
    const now = new Date().toISOString();
    const validatedData = await this.validateAttachmentData(input.type, input.data);
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
    };

    this.attachments.set(id, attachment);
    this.dirty = true;

    return attachment as VersionedAttachment<TType>;
  }

  async update(id: string, input: AttachmentUpdateInput): Promise<VersionedAttachment | undefined> {
    const attachment = this.attachments.get(id);
    if (!attachment) {
      return undefined;
    }

    if (input.description !== undefined) {
      attachment.description = input.description;
      this.dirty = true;
    }
    if (input.hidden !== undefined) {
      attachment.hidden = input.hidden;
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

    return attachment;
  }

  delete(id: string): boolean {
    const attachment = this.attachments.get(id);
    if (!attachment) {
      return false;
    }

    if (attachment.active === false) {
      return false;
    }

    attachment.active = false;
    this.dirty = true;
    return true;
  }

  restore(id: string): boolean {
    const attachment = this.attachments.get(id);
    if (!attachment) {
      return false;
    }

    if (attachment.active !== false) {
      return false;
    }

    attachment.active = true;
    this.dirty = true;
    return true;
  }

  permanentDelete(id: string): boolean {
    if (!this.attachments.has(id)) {
      return false;
    }

    this.attachments.delete(id);
    this.dirty = true;
    return true;
  }

  rename(id: string, description: string): boolean {
    const attachment = this.attachments.get(id);
    if (!attachment) {
      return false;
    }

    attachment.description = description;
    this.dirty = true;
    return true;
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
