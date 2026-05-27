/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MemoryVolume } from '../execution/runner/store/filesystem/memory_volume';
import { FilesystemService } from './filesystem_service';
import type { IWorkspaceClient } from '../workspaces';

const mockWorkspaceClient = (): jest.Mocked<IWorkspaceClient> => ({
  load: jest.fn().mockResolvedValue(undefined),
  save: jest.fn().mockResolvedValue(undefined),
});

describe('FilesystemService', () => {
  let toolResultsVolume: MemoryVolume;
  let skillsVolume: MemoryVolume;
  let workspaceClient: jest.Mocked<IWorkspaceClient>;

  beforeEach(() => {
    toolResultsVolume = new MemoryVolume('tool_results');
    skillsVolume = new MemoryVolume('skills');
    workspaceClient = mockWorkspaceClient();
  });

  it('exposes /workspace and /tmp after init', async () => {
    const service = new FilesystemService({
      toolResultsVolume,
      skillsVolume,
      workspaceClient,
    });
    await service.init();
    const fs = service.getFilesystem();
    expect(await fs.exists('/workspace')).toBe(true);
    expect(await fs.exists('/tmp')).toBe(true);
  });

  it('writes to /workspace land in the workspace mount', async () => {
    const service = new FilesystemService({ toolResultsVolume, skillsVolume, workspaceClient });
    await service.init();
    const fs = service.getFilesystem();
    await fs.writeFile('/workspace/note.txt', 'hi');
    expect(await fs.readFile('/workspace/note.txt')).toBe('hi');
  });

  it('writes to /tool_calls throw EROFS', async () => {
    const service = new FilesystemService({ toolResultsVolume, skillsVolume, workspaceClient });
    await service.init();
    const fs = service.getFilesystem();
    await expect(fs.writeFile('/tool_calls/x', 'y')).rejects.toThrow(/EROFS/);
  });

  it('loads workspace from WorkspaceClient on init when workspaceId is set', async () => {
    workspaceClient.load.mockResolvedValueOnce({
      workspace_id: 'ws-1',
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
      files: {
        '/workspace/persisted.txt': {
          content: Buffer.from('saved').toString('base64'),
          mode: 0o644,
          mtime: '2025-01-01T00:00:00.000Z',
        },
      },
    });

    const service = new FilesystemService({
      toolResultsVolume,
      skillsVolume,
      workspaceClient,
      workspaceId: 'ws-1',
    });
    await service.init();
    const fs = service.getFilesystem();
    expect(await fs.readFile('/workspace/persisted.txt')).toBe('saved');
  });

  it('does not call WorkspaceClient.load when no workspaceId is provided', async () => {
    const service = new FilesystemService({ toolResultsVolume, skillsVolume, workspaceClient });
    await service.init();
    expect(workspaceClient.load).not.toHaveBeenCalled();
  });

  it('snapshotWorkspaceFiles returns base64-encoded content + mode + mtime', async () => {
    const service = new FilesystemService({ toolResultsVolume, skillsVolume, workspaceClient });
    await service.init();
    const fs = service.getFilesystem();
    await fs.writeFile('/workspace/a.txt', 'alpha');
    await fs.writeFile('/workspace/sub/b.txt', 'beta');

    const snapshot = await service.snapshotWorkspaceFiles();
    expect(Object.keys(snapshot).sort()).toEqual(['/workspace/a.txt', '/workspace/sub/b.txt']);
    expect(Buffer.from(snapshot['/workspace/a.txt'].content, 'base64').toString()).toBe('alpha');
    expect(Buffer.from(snapshot['/workspace/sub/b.txt'].content, 'base64').toString()).toBe(
      'beta'
    );
    expect(typeof snapshot['/workspace/a.txt'].mode).toBe('number');
    expect(typeof snapshot['/workspace/a.txt'].mtime).toBe('string');
  });

  it('snapshotWorkspaceFiles on empty /workspace returns {}', async () => {
    const service = new FilesystemService({ toolResultsVolume, skillsVolume, workspaceClient });
    await service.init();
    const snapshot = await service.snapshotWorkspaceFiles();
    expect(snapshot).toEqual({});
  });
});
