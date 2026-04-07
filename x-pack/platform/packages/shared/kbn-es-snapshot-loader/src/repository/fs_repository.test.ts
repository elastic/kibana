/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { createFsRepository } from './fs_repository';

const log = new ToolingLog({
  level: 'silent',
  writeTo: {
    write: () => {},
  },
});

describe('createFsRepository', () => {
  it('throws when location is missing', () => {
    const repository = createFsRepository({ location: '' });

    expect(() => repository.validate()).toThrow('FS repository location is required');
  });

  it('passes validation for a valid config', () => {
    const repository = createFsRepository({ location: '/mount/backups' });

    expect(() => repository.validate()).not.toThrow();
  });

  it('registers an FS repository in Elasticsearch', async () => {
    const createRepository = jest.fn().mockResolvedValue(undefined);
    const esClient = {
      snapshot: {
        createRepository,
      },
    } as unknown as Client;
    const repository = createFsRepository({
      location: '/mount/backups',
      compress: true,
    });

    await repository.register({ esClient, log, repoName: 'test-repo' });

    expect(createRepository).toHaveBeenCalledWith(
      {
        name: 'test-repo',
        master_timeout: '2m',
        timeout: '2m',
        body: {
          type: 'fs',
          settings: {
            location: '/mount/backups',
            compress: true,
          },
        },
      },
      expect.objectContaining({ requestTimeout: expect.any(Number) })
    );
  });

  it('omits optional settings when undefined', async () => {
    const createRepository = jest.fn().mockResolvedValue(undefined);
    const esClient = {
      snapshot: {
        createRepository,
      },
    } as unknown as Client;
    const repository = createFsRepository({ location: '/mount/backups' });

    await repository.register({ esClient, log, repoName: 'test-repo' });

    expect(createRepository).toHaveBeenCalledWith(
      {
        name: 'test-repo',
        master_timeout: '2m',
        timeout: '2m',
        body: {
          type: 'fs',
          settings: {
            location: '/mount/backups',
          },
        },
      },
      expect.objectContaining({ requestTimeout: expect.any(Number) })
    );
  });
});
