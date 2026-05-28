/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { IFileSystem } from 'just-bash';
import { InMemoryFs } from 'just-bash';
import type { IWorkspaceClient, WorkspaceFile } from '../../workspaces';

const WORKSPACE_PREFIX = '/workspace';

export interface WorkspaceVolumeDeps {
  workspaceClient: IWorkspaceClient;
  /** Existing workspace id from the conversation, if any. */
  initialWorkspaceId?: string;
  /** Test-only override for the UUID generator. */
  generateId?: () => string;
}

/**
 * Owns the agent's writable workspace mount: the in-memory `IFileSystem` plus
 * the ES persistence concerns (load on init, snapshot + save on flush).
 *
 * Concretely encapsulates everything that's special about `/workspace`
 * compared to the other (read-only, in-memory-only) volumes mounted by
 * `FilesystemService`.
 */
export class WorkspaceVolume {
  private readonly deps: WorkspaceVolumeDeps;
  private readonly fs: InMemoryFs;
  private workspaceId?: string;
  private loaded = false;

  constructor(deps: WorkspaceVolumeDeps) {
    this.deps = deps;
    this.fs = new InMemoryFs();
    this.workspaceId = deps.initialWorkspaceId;
  }

  /**
   * Eager-load the persisted workspace from ES (if any) into the in-memory FS.
   * Idempotent — subsequent calls are no-ops.
   */
  async load(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    if (!this.workspaceId) return;
    const doc = await this.deps.workspaceClient.load(this.workspaceId);
    if (!doc) return;

    for (const [absolutePath, file] of Object.entries(doc.files)) {
      // Document keys carry the `/workspace` prefix; we're mounted at /workspace,
      // so strip it before writing in.
      const relativePath = absolutePath.startsWith(`${WORKSPACE_PREFIX}/`)
        ? absolutePath.slice(WORKSPACE_PREFIX.length)
        : absolutePath;
      const dirPath = relativePath.substring(0, relativePath.lastIndexOf('/')) || '/';
      if (dirPath !== '/') {
        await this.fs.mkdir(dirPath, { recursive: true });
      }
      const buf = Buffer.from(file.content, 'base64');
      await this.fs.writeFile(
        relativePath,
        new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
      );
    }
  }

  /**
   * The in-memory FS, suitable for mounting under `MountableFs`.
   */
  getFilesystem(): IFileSystem {
    return this.fs;
  }

  /**
   * Returns the existing workspace id if any, otherwise mints a new UUID and
   * remembers it. Subsequent calls return the same id.
   */
  getOrCreateWorkspaceId(): string {
    if (this.workspaceId) return this.workspaceId;
    this.workspaceId = (this.deps.generateId ?? uuidv4)();
    return this.workspaceId;
  }

  /** Returns the workspace id if one has been minted or provided, else undefined. */
  getWorkspaceId(): string | undefined {
    return this.workspaceId;
  }

  /**
   * Persist the current state of the workspace to ES. No-op when no
   * workspace_id has been minted. Also skips the ES write when the workspace
   * is empty and the document doesn't exist yet (avoids creating an empty doc).
   */
  async flush(): Promise<void> {
    if (!this.workspaceId) return;
    const files = await this.snapshot();
    if (Object.keys(files).length === 0) {
      const existing = await this.deps.workspaceClient.load(this.workspaceId);
      if (!existing) return;
    }
    await this.deps.workspaceClient.save(this.workspaceId, files);
  }

  /**
   * Walk the in-memory FS and produce the serialized file map. Exposed for
   * tests; production code should call `flush()`.
   */
  async snapshot(): Promise<Record<string, WorkspaceFile>> {
    const result: Record<string, WorkspaceFile> = {};
    const fs = this.fs;

    const walk = async (dir: string): Promise<void> => {
      let entries: Array<{ name: string; isFile: boolean; isDirectory: boolean }>;
      try {
        entries = await fs.readdirWithFileTypes!(dir);
      } catch {
        return;
      }
      for (const entry of entries) {
        const fullPath = dir === '/' ? `/${entry.name}` : `${dir}/${entry.name}`;
        if (entry.isDirectory) {
          await walk(fullPath);
        } else if (entry.isFile) {
          const bytes = await fs.readFileBuffer(fullPath);
          const stat = await fs.stat(fullPath);
          result[`${WORKSPACE_PREFIX}${fullPath}`] = {
            content: Buffer.from(bytes).toString('base64'),
            mode: stat.mode,
            mtime: stat.mtime.toISOString(),
          };
        }
      }
    };
    await walk('/');
    return result;
  }
}
