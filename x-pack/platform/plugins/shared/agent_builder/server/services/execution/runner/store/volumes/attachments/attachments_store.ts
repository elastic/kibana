/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { getLatestVersion, isAttachmentActive } from '@kbn/agent-builder-common/attachments';
import type { FsEntry } from '@kbn/agent-builder-server/runner/filestore';
import type { AttachmentsStorage } from '../../../../filesystem/attachments_storage';
import { MemoryVolume } from '../../memory_volume';
import { createAttachmentEntry } from './utils';
import type { AttachmentFileEntry, AttachmentRawBody } from './types';

export interface AttachmentsStoreDeps {
  /** Conversation attachments (only `uploaded_file` entries are materialized). */
  attachments: VersionedAttachment[];
  /** Persistence helper used to read raw bytes from workspace storage. */
  attachmentsStorage: AttachmentsStorage;
  /** Existing workspace id from the conversation, if any. */
  initialWorkspaceId?: string;
}

/**
 * Volume backing the `/attachments` mount. Materializes one `FileEntry` per
 * active `uploaded_file` attachment, with the raw bytes read from workspace
 * storage. The LLM-facing FS tools are guarded from serving the content;
 * server-side tools access the bytes via the filesystem service.
 */
export class AttachmentsStoreImpl {
  private readonly deps: AttachmentsStoreDeps;
  private readonly volume: MemoryVolume;
  private loaded = false;

  constructor(deps: AttachmentsStoreDeps) {
    this.deps = deps;
    this.volume = new MemoryVolume();
  }

  /**
   * Eager-load raw bytes for every active `uploaded_file` attachment from
   * workspace storage. Idempotent — subsequent calls are no-ops.
   */
  async load(): Promise<void> {
    if (this.loaded) return;
    const { attachments, attachmentsStorage, initialWorkspaceId } = this.deps;
    if (initialWorkspaceId) {
      for (const attachment of attachments) {
        if (attachment.type !== AttachmentType.uploadedFile) continue;
        if (!isAttachmentActive(attachment)) continue;
        const currentVersion = getLatestVersion(attachment);
        if (!currentVersion) continue;
        const bytes = await attachmentsStorage.read(initialWorkspaceId, attachment.id);
        if (!bytes) continue;
        this.volume.add(
          createAttachmentEntry({
            id: attachment.id,
            bytes,
            data: currentVersion.data as Parameters<typeof createAttachmentEntry>[0]['data'],
          })
        );
      }
    }
    this.loaded = true;
  }

  async getEntry(path: string): Promise<AttachmentFileEntry<AttachmentRawBody> | undefined> {
    // MemoryVolume erases FileEntry generics to <object, object>; we only ever
    // add AttachmentFileEntry<AttachmentRawBody> entries, so the cast is sound.
    return (await this.volume.get(path)) as AttachmentFileEntry<AttachmentRawBody> | undefined;
  }

  async listEntries(dirPath: string): Promise<FsEntry[]> {
    return this.volume.list(dirPath);
  }

  async entryExists(path: string): Promise<boolean> {
    return this.volume.exists(path);
  }
}

export const createAttachmentsStore = (deps: AttachmentsStoreDeps): AttachmentsStoreImpl => {
  return new AttachmentsStoreImpl(deps);
};
