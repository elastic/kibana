/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IFileSystem } from 'just-bash';
import { InMemoryFs, MountableFs } from 'just-bash';
import type { Volume } from '../execution/runner/store/filesystem/types';
import type { IWorkspaceClient, WorkspaceFile } from '../workspaces';
import { VolumeBackedReadOnlyFs } from './volume_backed_read_only_fs';

export interface FilesystemServiceDeps {
  toolResultsVolume: Volume;
  skillsVolume: Volume;
  workspaceClient: IWorkspaceClient;
  /** Existing workspace id from the conversation, if any. */
  workspaceId?: string;
}

const WORKSPACE_PREFIX = '/workspace';

/**
 * Owns the unified `IFileSystem` exposed to the agent. Always instantiated,
 * regardless of feature flags. Composes:
 *  - `/workspace`: writable InMemoryFs, persisted via WorkspaceClient
 *  - `/tool_calls`, `/skills`: read-only VolumeBackedReadOnlyFs adapters
 *  - `/tmp` and elsewhere: ephemeral base InMemoryFs
 */
export class FilesystemService {
  private readonly deps: FilesystemServiceDeps;
  private fs?: MountableFs;
  private workspaceFs?: InMemoryFs;
  private initialised = false;

  constructor(deps: FilesystemServiceDeps) {
    this.deps = deps;
  }

  async init(): Promise<void> {
    if (this.initialised) return;
    this.initialised = true;

    const base = new InMemoryFs();
    await base.mkdir('/tmp', { recursive: true });

    this.workspaceFs = new InMemoryFs();

    if (this.deps.workspaceId) {
      const doc = await this.deps.workspaceClient.load(this.deps.workspaceId);
      if (doc) {
        for (const [absolutePath, file] of Object.entries(doc.files)) {
          // Workspace document keys include the `/workspace` prefix; the workspaceFs
          // is mounted at /workspace, so strip the prefix before writing in.
          const relativePath = absolutePath.startsWith(`${WORKSPACE_PREFIX}/`)
            ? absolutePath.slice(WORKSPACE_PREFIX.length)
            : absolutePath;
          const dirPath = relativePath.substring(0, relativePath.lastIndexOf('/')) || '/';
          if (dirPath !== '/') {
            await this.workspaceFs.mkdir(dirPath, { recursive: true });
          }
          const buf = Buffer.from(file.content, 'base64');
          // Pass a Uint8Array view (Buffer is one already, but be explicit so
          // just-bash's encoding detection picks the binary path).
          await this.workspaceFs.writeFile(
            relativePath,
            new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
          );
        }
      }
    }

    const toolCallsFs = new VolumeBackedReadOnlyFs(this.deps.toolResultsVolume);
    const skillsFs = new VolumeBackedReadOnlyFs(this.deps.skillsVolume);

    this.fs = new MountableFs({
      base,
      mounts: [
        { mountPoint: WORKSPACE_PREFIX, filesystem: this.workspaceFs },
        { mountPoint: '/tool_calls', filesystem: toolCallsFs },
        { mountPoint: '/skills', filesystem: skillsFs },
      ],
    });
  }

  getFilesystem(): IFileSystem {
    if (!this.fs) {
      throw new Error('FilesystemService not initialised; call init() first');
    }
    return this.fs;
  }

  /**
   * Walks `/workspace` and produces the serialized file map for persistence.
   * Used by BashService.flush(). Returns an empty object if the workspace is empty.
   */
  async snapshotWorkspaceFiles(): Promise<Record<string, WorkspaceFile>> {
    if (!this.workspaceFs) {
      throw new Error('FilesystemService not initialised');
    }
    const result: Record<string, WorkspaceFile> = {};
    const workspaceFs = this.workspaceFs;

    const walk = async (dir: string): Promise<void> => {
      let entries: Array<{ name: string; isFile: boolean; isDirectory: boolean }>;
      try {
        entries = await workspaceFs.readdirWithFileTypes!(dir);
      } catch {
        return;
      }
      for (const entry of entries) {
        const fullPath = dir === '/' ? `/${entry.name}` : `${dir}/${entry.name}`;
        if (entry.isDirectory) {
          await walk(fullPath);
        } else if (entry.isFile) {
          const bytes = await workspaceFs.readFileBuffer(fullPath);
          const stat = await workspaceFs.stat(fullPath);
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
