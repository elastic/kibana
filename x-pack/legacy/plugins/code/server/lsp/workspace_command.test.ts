/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import os from 'os';
import { spawn } from 'child_process';
import { Logger } from '../log';
import { WorkspaceCommand } from './workspace_command';
import { RepoConfig } from '../../model/workspace';
jest.mock('child_process', () => ({
  spawn: jest.fn().mockImplementation(() => ({
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
    on: jest.fn().mockImplementation((event, cb) => {
      cb('foo-code', 'foo-signal');
    }),
  })),
}));
jest.mock('proper-lockfile', () => ({
  check: jest.fn().mockReturnValue(false),
  lock: jest.fn().mockImplementation(() => {
    return () => {};
  }),
}));

afterEach(() => {
  jest.clearAllMocks();
});

it(`spawns process if repoConfig.init comes from own properties`, async () => {
  const repoConfig = {
    repo: 'https://github.com/elastic/foo',
    init: ['echo', 'hello'],
  };
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
  };
  const command = new WorkspaceCommand(
    repoConfig,
    os.tmpdir(),
    'foo-revision',
    (mockLogger as unknown) as Logger
  );
  await command.runInit(true);
  expect(spawn).toHaveBeenCalled();
});

it(`doesn't spawn process if repoConfig.init comes from prototypes properties`, async () => {
  const prototype = {
    init: ['echo', 'noooo'],
  };

  const repoConfig = {
    repo: 'https://github.com/elastic/foo',
  };

  Object.setPrototypeOf(repoConfig, prototype);

  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
  };
  const command = new WorkspaceCommand(
    (repoConfig as unknown) as RepoConfig,
    os.tmpdir(),
    'foo-revision',
    (mockLogger as unknown) as Logger
  );
  await command.runInit(true);
  expect(spawn).not.toHaveBeenCalled();
});
