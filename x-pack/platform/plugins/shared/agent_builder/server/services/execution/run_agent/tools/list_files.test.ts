/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createListFilesTool } from './list_files';
import { FilesystemService } from '../../filesystem/filesystem_service';
import { WorkspaceVolume } from '../../filesystem/workspace_volume';
import { MemoryVolume } from '../../runner/store/filesystem/memory_volume';
import type { IWorkspaceClient } from '../../../workspaces';

const makeService = async () => {
  const workspaceClient: jest.Mocked<IWorkspaceClient> = {
    load: jest.fn().mockResolvedValue(undefined),
    save: jest.fn().mockResolvedValue(undefined),
  };
  const workspaceVolume = new WorkspaceVolume({ workspaceClient });
  const service = new FilesystemService({
    workspaceVolume,
    toolResultsSource: new MemoryVolume(),
    skillsSource: new MemoryVolume(),
  });
  await service.init();
  return service;
};

interface StandardReturn {
  results: Array<{
    type: string;
    data: {
      path?: string;
      entries?: Array<{ name: string; type: 'file' | 'directory' }>;
    } & Record<string, unknown>;
  }>;
}

describe('list_files', () => {
  it('lists files in a workspace directory', async () => {
    const service = await makeService();
    const fs = service.getFilesystem();
    await fs.mkdir('/workspace/sub', { recursive: true });
    await fs.writeFile('/workspace/sub/a.txt', 'a');
    await fs.writeFile('/workspace/sub/b.txt', 'b');
    await fs.mkdir('/workspace/sub/nested', { recursive: true });

    const tool = createListFilesTool({ filesystemService: service });
    const out = (await tool.handler({ path: '/workspace/sub' }, {} as never)) as StandardReturn;

    expect(out.results).toHaveLength(1);
    expect(out.results[0].type).toBe('other');
    expect(out.results[0].data.path).toBe('/workspace/sub');
    expect(out.results[0].data.entries).toEqual(
      expect.arrayContaining([
        { name: 'a.txt', type: 'file' },
        { name: 'b.txt', type: 'file' },
        { name: 'nested', type: 'directory' },
      ])
    );
  });

  it('returns an error result for a nonexistent path', async () => {
    const service = await makeService();
    const tool = createListFilesTool({ filesystemService: service });
    const out = (await tool.handler({ path: '/workspace/does-not-exist' }, {} as never)) as {
      results: Array<{ type: string; data: { message: string } }>;
    };
    expect(out.results[0].type).toBe('error');
    expect(out.results[0].data.message).toMatch(/list_files '\/workspace\/does-not-exist'/);
  });
});
