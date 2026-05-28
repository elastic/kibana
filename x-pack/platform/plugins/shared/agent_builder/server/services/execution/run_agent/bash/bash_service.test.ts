/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BashService } from './bash_service';
import { FilesystemService } from '../../filesystem/filesystem_service';
import { MemoryVolume } from '../../runner/store/filesystem/memory_volume';
import type { IWorkspaceClient } from '../../../workspaces';
import { SAFEGUARD_TOKEN_COUNT } from './output_truncation';

const makeFsService = async (workspaceId?: string) => {
  const workspaceClient: jest.Mocked<IWorkspaceClient> = {
    load: jest.fn().mockResolvedValue(undefined),
    save: jest.fn().mockResolvedValue(undefined),
  };
  const fsService = new FilesystemService({
    toolResultsVolume: new MemoryVolume('tool_results'),
    skillsVolume: new MemoryVolume('skills'),
    workspaceClient,
    workspaceId,
  });
  await fsService.init();
  return { fsService, workspaceClient };
};

describe('BashService', () => {
  it('exec runs a script in the unified FS, cwd is /tmp', async () => {
    const { fsService, workspaceClient } = await makeFsService();
    const bash = new BashService({
      filesystemService: fsService,
      workspaceClient,
      execToolFn: jest.fn(),
      resolveToolId: (id) => id,
    });
    const result = await bash.exec('pwd');
    expect(result.exit_code).toBe(0);
    expect(result.stdout.trim()).toBe('/tmp');
  });

  it('writes to /workspace persist across exec calls in the same run', async () => {
    const { fsService, workspaceClient } = await makeFsService();
    const bash = new BashService({
      filesystemService: fsService,
      workspaceClient,
      execToolFn: jest.fn(),
      resolveToolId: (id) => id,
    });
    await bash.exec('echo hi > /workspace/note.txt');
    const result = await bash.exec('cat /workspace/note.txt');
    expect(result.exit_code).toBe(0);
    expect(result.stdout.trim()).toBe('hi');
  });

  it('flush() saves /workspace files to WorkspaceClient', async () => {
    const { fsService, workspaceClient } = await makeFsService();
    const bash = new BashService({
      filesystemService: fsService,
      workspaceClient,
      execToolFn: jest.fn(),
      resolveToolId: (id) => id,
      getOrCreateWorkspaceIdHook: () => 'ws-test',
    });
    await bash.exec('echo data > /workspace/file.txt');
    await bash.flush();
    expect(workspaceClient.save).toHaveBeenCalledTimes(1);
    const [wsId, files] = workspaceClient.save.mock.calls[0];
    expect(wsId).toBe('ws-test');
    expect(files['/workspace/file.txt']).toBeDefined();
    expect(Buffer.from(files['/workspace/file.txt'].content, 'base64').toString()).toBe('data\n');
  });

  it('flush() is a no-op when bash was never used in this run', async () => {
    const { fsService, workspaceClient } = await makeFsService();
    const bash = new BashService({
      filesystemService: fsService,
      workspaceClient,
      execToolFn: jest.fn(),
      resolveToolId: (id) => id,
    });
    await bash.flush();
    expect(workspaceClient.save).not.toHaveBeenCalled();
  });

  it('flush() is a no-op when workspace is empty AND no doc exists', async () => {
    const { fsService, workspaceClient } = await makeFsService();
    const bash = new BashService({
      filesystemService: fsService,
      workspaceClient,
      execToolFn: jest.fn(),
      resolveToolId: (id) => id,
      getOrCreateWorkspaceIdHook: () => 'ws-empty',
    });
    await bash.exec('echo hello'); // touches but writes nothing under /workspace
    await bash.flush();
    expect(workspaceClient.save).not.toHaveBeenCalled();
  });

  it('truncates large stdout', async () => {
    const { fsService, workspaceClient } = await makeFsService();
    const bash = new BashService({
      filesystemService: fsService,
      workspaceClient,
      execToolFn: jest.fn(),
      resolveToolId: (id) => id,
    });
    // Produce ~5x the token-safeguard's worth of output (50k chars × 4 ≈ 50k tokens).
    const chars = SAFEGUARD_TOKEN_COUNT * 20;
    const result = await bash.exec(`printf '%${chars}s' '' | tr ' ' x`);
    expect(result.exit_code).toBe(0);
    expect(result.truncated).toBe(true);
  });

  it('returns exit_code 124 on wall-clock timeout', async () => {
    const { fsService, workspaceClient } = await makeFsService();
    const bash = new BashService({
      filesystemService: fsService,
      workspaceClient,
      execToolFn: jest.fn(),
      resolveToolId: (id) => id,
      timeoutMs: 100,
    });
    const result = await bash.exec('sleep 5');
    expect(result.exit_code).toBe(124);
    expect(result.stderr).toMatch(/timeout/i);
  });

  it('exec_tool inside the script invokes the supplied callback', async () => {
    const { fsService, workspaceClient } = await makeFsService();
    const execToolFn = jest.fn().mockResolvedValue({ ok: true });
    const bash = new BashService({
      filesystemService: fsService,
      workspaceClient,
      execToolFn,
      resolveToolId: (id) => id,
    });
    const result = await bash.exec("exec_tool platform.foo --args='{\"a\":1}' | cat");
    expect(result.exit_code).toBe(0);
    expect(execToolFn).toHaveBeenCalledWith('platform.foo', { a: 1 });
    expect(result.stdout).toContain('"ok":true');
  });

  describe('getOrCreateWorkspaceId', () => {
    it('returns the existing id when one is set', async () => {
      const { fsService, workspaceClient } = await makeFsService();
      const bash = new BashService({
        filesystemService: fsService,
        workspaceClient,
        execToolFn: jest.fn(),
        resolveToolId: (id) => id,
        initialWorkspaceId: 'existing',
      });
      expect(bash.getOrCreateWorkspaceId()).toBe('existing');
    });

    it('mints a new UUID when none is provided, and reuses it', async () => {
      const { fsService, workspaceClient } = await makeFsService();
      const bash = new BashService({
        filesystemService: fsService,
        workspaceClient,
        execToolFn: jest.fn(),
        resolveToolId: (id) => id,
      });
      const first = bash.getOrCreateWorkspaceId();
      expect(first).toMatch(/^[0-9a-f-]{36}$/);
      expect(bash.getOrCreateWorkspaceId()).toBe(first);
    });
  });
});
