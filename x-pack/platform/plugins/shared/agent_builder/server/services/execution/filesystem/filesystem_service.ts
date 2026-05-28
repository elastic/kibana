/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IFileSystem } from 'just-bash';
import { InMemoryFs, MountableFs } from 'just-bash';
import type { IFilesystemService } from '@kbn/agent-builder-server/runner';
import type { Volume } from '../runner/store/filesystem/types';
import { VolumeBackedReadOnlyFs } from './volume_backed_read_only_fs';
import type { WorkspaceVolume } from './workspace_volume';

export interface FilesystemServiceDeps {
  workspaceVolume: WorkspaceVolume;
  toolResultsVolume: Volume;
  skillsVolume: Volume;
}

const WORKSPACE_PREFIX = '/workspace';

/**
 * Owns the unified `IFileSystem` exposed to the agent. Always instantiated,
 * regardless of feature flags. Pure composition — every mount is backed by a
 * dedicated volume:
 *  - `/workspace`: `WorkspaceVolume` (writable + ES-persisted)
 *  - `/tool_calls`, `/skills`: `VolumeBackedReadOnlyFs` adapters over the
 *    existing tool-result / skills stores (read-only)
 *  - `/tmp` (and elsewhere): ephemeral base `InMemoryFs`
 */
export class FilesystemService implements IFilesystemService {
  private readonly deps: FilesystemServiceDeps;
  private fs?: MountableFs;
  private initialised = false;

  constructor(deps: FilesystemServiceDeps) {
    this.deps = deps;
  }

  async init(): Promise<void> {
    if (this.initialised) return;
    this.initialised = true;

    const base = new InMemoryFs();
    await base.mkdir('/tmp', { recursive: true });

    await this.deps.workspaceVolume.load();

    const toolCallsFs = new VolumeBackedReadOnlyFs(this.deps.toolResultsVolume);
    const skillsFs = new VolumeBackedReadOnlyFs(this.deps.skillsVolume);

    this.fs = new MountableFs({
      base,
      mounts: [
        { mountPoint: WORKSPACE_PREFIX, filesystem: this.deps.workspaceVolume.getFilesystem() },
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
}
