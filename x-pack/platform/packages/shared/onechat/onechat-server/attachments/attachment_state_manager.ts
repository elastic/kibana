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
} from '@kbn/onechat-common/attachments';
import {
  getLatestVersion,
  getVersion,
  isAttachmentActive,
  hashContent,
  estimateTokens,
} from '@kbn/onechat-common/attachments';

/**
 * Input for adding a new attachment to the state manager.
 */
export interface AttachmentAddInput {
  /** Optional ID for the attachment (if not provided, a UUID will be generated) */
  id?: string;
  /** Type of the attachment */
  type: string;
  /** The attachment data */
  data: unknown;
  /** Human-readable description */
  description?: string;
  /** Whether the attachment should be hidden */
  hidden?: boolean;
}

/**
 * Interface for managing conversation-level versioned attachments.
 * Provides read and write operations for attachment lifecycle management.
 */
export interface AttachmentStateManager {
  // Read operations

  /**
   * Gets an attachment by its ID.
   * @param attachmentId - The ID of the attachment
   * @returns The attachment if found, undefined otherwise
   */
  get(attachmentId: string): VersionedAttachment | undefined;

  /**
   * Gets the latest version of an attachment.
   * @param attachmentId - The ID of the attachment
   * @returns The latest version if found, undefined otherwise
   */
  getLatest(attachmentId: string): AttachmentVersion | undefined;

  /**
   * Gets a specific version of an attachment.
   * @param attachmentId - The ID of the attachment
   * @param version - The version number
   * @returns The version if found, undefined otherwise
   */
  getVersion(attachmentId: string, version: number): AttachmentVersion | undefined;

  /**
   * Gets all active (non-deleted) attachments.
   * @returns Array of active attachments
   */
  getActive(): VersionedAttachment[];

  /**
   * Gets all attachments (including deleted).
   * @returns Array of all attachments
   */
  getAll(): VersionedAttachment[];

  /**
   * Gets a diff between two versions of an attachment.
   * @param attachmentId - The ID of the attachment
   * @param fromVersion - The starting version
   * @param toVersion - The ending version (defaults to current)
   * @returns The diff between versions
   */
  getDiff(attachmentId: string, fromVersion: number, toVersion?: number): AttachmentDiff | undefined;

  // Write operations

  /**
   * Adds a new attachment to the conversation.
   * @param input - The attachment input
   * @returns The created attachment
   */
  add(input: AttachmentAddInput): VersionedAttachment;

  /**
   * Updates an attachment with new data (creates a new version).
   * @param attachmentId - The ID of the attachment to update
   * @param data - The new data
   * @param description - Optional new description
   * @returns The new version if successful, undefined if attachment not found
   */
  update(attachmentId: string, data: unknown, description?: string): AttachmentVersion | undefined;

  /**
   * Soft-deletes an attachment (marks as deleted, preserves history).
   * @param attachmentId - The ID of the attachment to delete
   * @returns true if successful, false if attachment not found
   */
  delete(attachmentId: string): boolean;

  /**
   * Restores a soft-deleted attachment.
   * @param attachmentId - The ID of the attachment to restore
   * @returns true if successful, false if attachment not found or not deleted
   */
  restore(attachmentId: string): boolean;

  /**
   * Permanently deletes an attachment (removes it completely).
   * This should only be used for attachments that have never been referenced in conversation rounds.
   * @param attachmentId - The ID of the attachment to permanently delete
   * @returns true if successful, false if attachment not found
   */
  permanentDelete(attachmentId: string): boolean;

  /**
   * Updates the attachment metadata (description) without creating a new version.
   * @param attachmentId - The ID of the attachment to rename
   * @param description - The new description/title
   * @returns true if successful, false if attachment not found
   */
  rename(attachmentId: string, description: string): boolean;

  // Utility functions

  /**
   * Resolves attachment version references to actual attachment data.
   * @param refs - Array of attachment version references
   * @returns Array of resolved attachments with their referenced versions
   */
  resolveRefs(refs: AttachmentVersionRef[]): Array<{ attachment: VersionedAttachment; version: AttachmentVersion }>;

  /**
   * Gets the total estimated token count for all active attachments.
   * @returns The total estimated token count
   */
  getTotalTokenEstimate(): number;

  /**
   * Exports the current state as an array of attachments.
   * @returns Array of all attachments
   */
  toArray(): VersionedAttachment[];

  /**
   * Returns whether there are any changes since initialization.
   * @returns true if there are changes
   */
  hasChanges(): boolean;
}

/**
 * Creates an attachment state manager instance.
 * @param initialAttachments - Initial attachments to populate the manager with
 * @returns An AttachmentStateManager instance
 */
export const createAttachmentStateManager = (
  initialAttachments: VersionedAttachment[] = []
): AttachmentStateManager => {
  return new AttachmentStateManagerImpl(initialAttachments);
};

class AttachmentStateManagerImpl implements AttachmentStateManager {
  private attachments: Map<string, VersionedAttachment>;
  private dirty: boolean = false;

  constructor(initialAttachments: VersionedAttachment[]) {
    this.attachments = new Map();
    for (const attachment of initialAttachments) {
      this.attachments.set(attachment.id, structuredClone(attachment));
    }
  }

  // Read operations

  get(attachmentId: string): VersionedAttachment | undefined {
    return this.attachments.get(attachmentId);
  }

  getLatest(attachmentId: string): AttachmentVersion | undefined {
    const attachment = this.attachments.get(attachmentId);
    if (!attachment) {
      return undefined;
    }
    return getLatestVersion(attachment);
  }

  getVersion(attachmentId: string, version: number): AttachmentVersion | undefined {
    const attachment = this.attachments.get(attachmentId);
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

  getDiff(attachmentId: string, fromVersion: number, toVersion?: number): AttachmentDiff | undefined {
    const attachment = this.attachments.get(attachmentId);
    if (!attachment) {
      return undefined;
    }

    const effectiveToVersion = toVersion ?? attachment.current_version;
    const fromVer = getVersion(attachment, fromVersion);
    const toVer = getVersion(attachment, effectiveToVersion);

    if (!fromVer || !toVer) {
      return undefined;
    }

    // Determine change type
    let change_type: AttachmentDiff['change_type'];
    if (fromVer.status === 'active' && toVer.status === 'deleted') {
      change_type = 'delete';
    } else if (fromVer.status === 'deleted' && toVer.status === 'active') {
      change_type = 'restore';
    } else if (fromVersion === 1 && toVersion === 1) {
      change_type = 'create';
    } else {
      change_type = 'update';
    }

    // Build summary
    let summary: string;
    switch (change_type) {
      case 'create':
        summary = `Created ${attachment.type} attachment`;
        break;
      case 'delete':
        summary = `Deleted ${attachment.type} attachment`;
        break;
      case 'restore':
        summary = `Restored ${attachment.type} attachment`;
        break;
      case 'update':
        summary = `Updated ${attachment.type} attachment from v${fromVersion} to v${effectiveToVersion}`;
        break;
    }

    // Detect changed fields for updates
    let changed_fields: string[] | undefined;
    if (change_type === 'update') {
      changed_fields = this.detectChangedFields(fromVer.data, toVer.data);
    }

    return { change_type, summary, changed_fields };
  }

  // Write operations

  add(input: AttachmentAddInput): VersionedAttachment {
    const id = input.id || uuidv4();
    const now = new Date().toISOString();
    const contentHash = hashContent(input.data);
    const estimatedTokens = estimateTokens(input.data);

    const version: AttachmentVersion = {
      version: 1,
      type: input.type,
      data: input.data,
      created_at: now,
      status: 'active',
      content_hash: contentHash,
      estimated_tokens: estimatedTokens,
    };

    const attachment: VersionedAttachment = {
      id,
      type: input.type,
      versions: [version],
      current_version: 1,
      description: input.description,
      hidden: input.hidden,
      // Store client_id if a client-provided ID was used
      client_id: input.id,
    };

    this.attachments.set(id, attachment);
    this.dirty = true;

    return attachment;
  }

  update(attachmentId: string, data: unknown, description?: string): AttachmentVersion | undefined {
    const attachment = this.attachments.get(attachmentId);
    if (!attachment) {
      return undefined;
    }

    const contentHash = hashContent(data);
    const currentVersion = getLatestVersion(attachment);

    // Check if content has actually changed by comparing hashes
    const contentChanged = !currentVersion || currentVersion.content_hash !== contentHash;
    const descriptionChanged = description !== undefined && description !== attachment.description;

    // If nothing changed, return the current version without creating a new one
    if (!contentChanged && !descriptionChanged) {
      return currentVersion;
    }

    // If only description changed (no content change), update description without new version
    if (!contentChanged && descriptionChanged) {
      attachment.description = description;
      this.dirty = true;
      return currentVersion;
    }

    // Content changed - create a new version
    const now = new Date().toISOString();
    const estimatedTokens = estimateTokens(data);
    const newVersionNumber = attachment.current_version + 1;

    const newVersion: AttachmentVersion = {
      version: newVersionNumber,
      type: attachment.type,
      data,
      created_at: now,
      status: 'active',
      content_hash: contentHash,
      estimated_tokens: estimatedTokens,
    };

    attachment.versions.push(newVersion);
    attachment.current_version = newVersionNumber;
    if (description !== undefined) {
      attachment.description = description;
    }

    this.dirty = true;
    return newVersion;
  }

  delete(attachmentId: string): boolean {
    const attachment = this.attachments.get(attachmentId);
    if (!attachment) {
      return false;
    }

    const currentVersion = getLatestVersion(attachment);
    if (!currentVersion || currentVersion.status === 'deleted') {
      return false; // Already deleted or no version
    }

    // Create a new "deleted" version
    const now = new Date().toISOString();
    const newVersionNumber = attachment.current_version + 1;

    const deletedVersion: AttachmentVersion = {
      version: newVersionNumber,
      type: attachment.type,
      data: currentVersion.data, // Keep the same data
      created_at: now,
      status: 'deleted',
      content_hash: currentVersion.content_hash,
      estimated_tokens: currentVersion.estimated_tokens,
    };

    attachment.versions.push(deletedVersion);
    attachment.current_version = newVersionNumber;

    this.dirty = true;
    return true;
  }

  restore(attachmentId: string): boolean {
    const attachment = this.attachments.get(attachmentId);
    if (!attachment) {
      return false;
    }

    const currentVersion = getLatestVersion(attachment);
    if (!currentVersion || currentVersion.status === 'active') {
      return false; // Not deleted or no version
    }

    // Find the last active version's data
    let lastActiveData = currentVersion.data;
    for (let i = attachment.versions.length - 1; i >= 0; i--) {
      if (attachment.versions[i].status === 'active') {
        lastActiveData = attachment.versions[i].data;
        break;
      }
    }

    // Create a new "active" version with the restored data
    const now = new Date().toISOString();
    const newVersionNumber = attachment.current_version + 1;
    const contentHash = hashContent(lastActiveData);
    const estimatedTokens = estimateTokens(lastActiveData);

    const restoredVersion: AttachmentVersion = {
      version: newVersionNumber,
      type: attachment.type,
      data: lastActiveData,
      created_at: now,
      status: 'active',
      content_hash: contentHash,
      estimated_tokens: estimatedTokens,
    };

    attachment.versions.push(restoredVersion);
    attachment.current_version = newVersionNumber;

    this.dirty = true;
    return true;
  }

  permanentDelete(attachmentId: string): boolean {
    const attachment = this.attachments.get(attachmentId);
    if (!attachment) {
      return false;
    }

    // Remove the attachment completely from the map
    this.attachments.delete(attachmentId);
    this.dirty = true;
    return true;
  }

  rename(attachmentId: string, description: string): boolean {
    const attachment = this.attachments.get(attachmentId);
    if (!attachment) {
      return false;
    }

    // Update the description without creating a new version
    attachment.description = description;
    this.dirty = true;
    return true;
  }

  // Utility functions

  resolveRefs(refs: AttachmentVersionRef[]): Array<{ attachment: VersionedAttachment; version: AttachmentVersion }> {
    const resolved: Array<{ attachment: VersionedAttachment; version: AttachmentVersion }> = [];

    for (const ref of refs) {
      const attachment = this.attachments.get(ref.attachment_id);
      if (!attachment) {
        continue;
      }

      const version = getVersion(attachment, ref.version);
      if (!version) {
        continue;
      }

      resolved.push({ attachment, version });
    }

    return resolved;
  }

  getTotalTokenEstimate(): number {
    let total = 0;
    for (const attachment of this.getActive()) {
      const latest = getLatestVersion(attachment);
      if (latest?.estimated_tokens) {
        total += latest.estimated_tokens;
      }
    }
    return total;
  }

  toArray(): VersionedAttachment[] {
    return Array.from(this.attachments.values());
  }

  hasChanges(): boolean {
    return this.dirty;
  }

  // Private helpers

  private detectChangedFields(oldData: unknown, newData: unknown): string[] {
    const changedFields: string[] = [];

    if (typeof oldData !== 'object' || typeof newData !== 'object') {
      return ['data'];
    }

    if (oldData === null || newData === null) {
      return ['data'];
    }

    const oldObj = oldData as Record<string, unknown>;
    const newObj = newData as Record<string, unknown>;

    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

    for (const key of allKeys) {
      if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
        changedFields.push(key);
      }
    }

    return changedFields;
  }
}
