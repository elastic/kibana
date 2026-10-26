/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createScopedRunnerDepsMock } from '../../../../test_utils';
import { RunnerManager } from '../runner';
import { createFilesystemServices } from './filesystem';

describe('createFilesystemServices', () => {
  const createServices = (bash: boolean) => {
    const deps = createScopedRunnerDepsMock();
    const manager = new RunnerManager(deps);
    return createFilesystemServices({
      manager,
      experimentalFeatures: { ...deps.experimentalFeatures, bash },
      persistWorkspace: false,
      spaceId: 'default',
    });
  };

  it('initializes the filesystem for a run with Bash disabled', async () => {
    const { filesystemService, bashService } = await createServices(false);
    expect(await filesystemService.getFilesystem().exists('/workspace')).toBe(true);
    expect(await filesystemService.getFilesystem().exists('/tmp')).toBe(true);
    expect(bashService).toBeUndefined();
  });

  it('runs Bash against the initialized filesystem when enabled', async () => {
    const { filesystemService, bashService } = await createServices(true);
    expect(bashService).toBeDefined();
    if (!bashService) {
      throw new Error('BashService was not created');
    }
    const result = await bashService.exec('echo hello > /workspace/note.txt');
    expect(result.exit_code).toBe(0);
    expect(await filesystemService.getFilesystem().readFile('/workspace/note.txt')).toBe('hello\n');
  });
});
