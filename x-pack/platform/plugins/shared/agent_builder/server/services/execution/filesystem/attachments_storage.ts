/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IWorkspaceClient, WorkspaceFile } from '../../workspaces';

/**
 * Path prefix used for raw uploaded bytes inside the workspace doc. The
 * workspace doc is a flat map of absolute path → base64 content; the
 * {@link AttachmentsVolume} reads entries keyed under this prefix and exposes
 * them at {@link MOUNT_POINTS.attachments} in the agent's VFS.
 */
export const ATTACHMENTS_PATH_PREFIX = '/attachments';

const metaPath = (id: string): string => `${ATTACHMENTS_PATH_PREFIX}/${id}.meta.json`;
const bytesPath = (id: string): string => `${ATTACHMENTS_PATH_PREFIX}/${id}`;

/** Sidecar metadata persisted alongside each uploaded blob. */
export interface AttachmentMeta {
  name: string;
  mime: string;
  size: number;
}

/**
 * Request-scoped helper that persists raw uploaded-file bytes and their
 * sidecar metadata into workspace storage (the ES workspace doc, keyed by
 * workspaceId). Reuses {@link IWorkspaceClient} so no new persistence layer
 * is introduced.
 *
 * Bytes are stored base64-encoded under `/attachments/<id>`; metadata under
 * `/attachments/<id>.meta.json`. The workspace doc is a single 25 MiB base64
 * document, which is sufficient for the example use case.
 */
export interface AttachmentsStorage {
  store(workspaceId: string, id: string, bytes: Buffer, meta: AttachmentMeta): Promise<void>;
  read(workspaceId: string, id: string): Promise<Buffer | undefined>;
  readMeta(workspaceId: string, id: string): Promise<AttachmentMeta | undefined>;
  delete(workspaceId: string, id: string): Promise<boolean>;
  /** Load all attachment entries (bytes + meta) currently persisted for the workspace. */
  loadAll(workspaceId: string): Promise<Array<{ id: string; bytes: Buffer; meta: AttachmentMeta }>>;
}

export const createAttachmentsStorage = ({
  workspaceClient,
}: {
  workspaceClient: IWorkspaceClient;
}): AttachmentsStorage => {
  const readAllFiles = async (workspaceId: string): Promise<Record<string, WorkspaceFile>> => {
    const snapshot = await workspaceClient.load(workspaceId);
    return snapshot?.files ?? {};
  };

  const saveFiles = async (
    workspaceId: string,
    files: Record<string, WorkspaceFile>
  ): Promise<void> => {
    await workspaceClient.save(workspaceId, files);
  };

  return {
    store: async (workspaceId, id, bytes, meta) => {
      const files = await readAllFiles(workspaceId);
      const now = new Date().toISOString();
      files[bytesPath(id)] = {
        content: bytes.toString('base64'),
        mode: 0o644,
        mtime: now,
      };
      files[metaPath(id)] = {
        content: Buffer.from(JSON.stringify(meta), 'utf8').toString('base64'),
        mode: 0o644,
        mtime: now,
      };
      await saveFiles(workspaceId, files);
    },

    read: async (workspaceId, id) => {
      const files = await readAllFiles(workspaceId);
      const entry = files[bytesPath(id)];
      if (!entry) return undefined;
      return Buffer.from(entry.content, 'base64');
    },

    readMeta: async (workspaceId, id) => {
      const files = await readAllFiles(workspaceId);
      const entry = files[metaPath(id)];
      if (!entry) return undefined;
      try {
        return JSON.parse(Buffer.from(entry.content, 'base64').toString('utf8')) as AttachmentMeta;
      } catch {
        return undefined;
      }
    },

    delete: async (workspaceId, id) => {
      const files = await readAllFiles(workspaceId);
      const bPath = bytesPath(id);
      const mPath = metaPath(id);
      if (!(bPath in files) && !(mPath in files)) return false;
      delete files[bPath];
      delete files[mPath];
      await saveFiles(workspaceId, files);
      return true;
    },

    loadAll: async (workspaceId) => {
      const files = await readAllFiles(workspaceId);
      const results: Array<{ id: string; bytes: Buffer; meta: AttachmentMeta }> = [];
      for (const [key, file] of Object.entries(files)) {
        if (!key.startsWith(`${ATTACHMENTS_PATH_PREFIX}/`)) continue;
        if (key.endsWith('.meta.json')) continue;
        const id = key.slice(`${ATTACHMENTS_PATH_PREFIX}/`.length);
        const bytes = Buffer.from(file.content, 'base64');
        const metaEntry = files[metaPath(id)];
        let meta: AttachmentMeta;
        if (metaEntry) {
          try {
            meta = JSON.parse(Buffer.from(metaEntry.content, 'base64').toString('utf8'));
          } catch {
            meta = { name: id, mime: 'application/octet-stream', size: bytes.length };
          }
        } else {
          meta = { name: id, mime: 'application/octet-stream', size: bytes.length };
        }
        results.push({ id, bytes, meta });
      }
      return results;
    },
  };
};
