/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import type { RepositoryStrategy } from '../repository/types';
import { createSnapshot } from '.';

const log = new ToolingLog({
  level: 'silent',
  writeTo: {
    write: () => {},
  },
});

describe('createSnapshot', () => {
  const createRepositoryStrategy = () => {
    const validate = jest.fn();
    const register = jest.fn().mockResolvedValue(undefined);

    const repository: RepositoryStrategy = {
      type: 'gcs',
      validate,
      register,
    };

    return { repository, validate, register };
  };

  it('creates a snapshot successfully and cleans up repository registration', async () => {
    const create = jest.fn().mockResolvedValue({
      snapshot: {
        indices: ['logs-app-1', 'metrics-host-1'],
      },
    });
    const deleteRepository = jest.fn().mockResolvedValue(undefined);
    const esClient = {
      snapshot: {
        create,
        deleteRepository,
      },
    } as unknown as Client;
    const { repository, validate, register } = createRepositoryStrategy();

    const result = await createSnapshot({
      esClient,
      log,
      repository,
      snapshotName: 'snapshot-1',
    });

    expect(validate).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith({
      esClient,
      log,
      repoName: expect.stringContaining('snapshot-loader-repo-'),
    });
    expect(create).toHaveBeenCalledWith({
      repository: expect.stringContaining('snapshot-loader-repo-'),
      snapshot: 'snapshot-1',
      wait_for_completion: true,
      include_global_state: false,
      ignore_unavailable: false,
    });
    expect(deleteRepository).toHaveBeenCalledWith({
      name: expect.stringContaining('snapshot-loader-repo-'),
    });
    expect(result).toEqual({
      success: true,
      snapshotName: 'snapshot-1',
      indices: ['logs-app-1', 'metrics-host-1'],
      errors: [],
    });
  });

  it('returns a failure result when snapshot creation fails and still cleans up', async () => {
    const create = jest.fn().mockRejectedValue(new Error('snapshot create failed'));
    const deleteRepository = jest.fn().mockResolvedValue(undefined);
    const esClient = {
      snapshot: {
        create,
        deleteRepository,
      },
    } as unknown as Client;
    const { repository } = createRepositoryStrategy();

    const result = await createSnapshot({
      esClient,
      log,
      repository,
      snapshotName: 'snapshot-2',
    });

    expect(result.success).toBe(false);
    expect(result.snapshotName).toBe('snapshot-2');
    expect(result.indices).toEqual([]);
    expect(result.errors).toEqual(['snapshot create failed']);
    expect(deleteRepository).toHaveBeenCalledWith({
      name: expect.stringContaining('snapshot-loader-repo-'),
    });
  });

  it('fails when snapshot response contains no indices', async () => {
    const create = jest.fn().mockResolvedValue({ snapshot: { indices: [] } });
    const deleteRepository = jest.fn().mockResolvedValue(undefined);
    const esClient = {
      snapshot: { create, deleteRepository },
    } as unknown as Client;
    const { repository } = createRepositoryStrategy();

    const result = await createSnapshot({
      esClient,
      log,
      repository,
      snapshotName: 'empty-snap',
    });

    expect(result.success).toBe(false);
    expect(result.indices).toEqual([]);
    expect(result.errors).toEqual(['Snapshot was created but no indices were captured']);
    expect(deleteRepository).toHaveBeenCalled();
  });

  it('forwards index filters to Elasticsearch snapshot.create', async () => {
    const create = jest.fn().mockResolvedValue({
      snapshot: {
        indices: ['logs-app-1'],
      },
    });
    const deleteRepository = jest.fn().mockResolvedValue(undefined);
    const esClient = {
      snapshot: {
        create,
        deleteRepository,
      },
    } as unknown as Client;
    const { repository } = createRepositoryStrategy();

    await createSnapshot({
      esClient,
      log,
      repository,
      snapshotName: 'snapshot-with-indices',
      indices: ['logs-*', 'metrics-*'],
    });

    expect(create).toHaveBeenCalledWith({
      repository: expect.stringContaining('snapshot-loader-repo-'),
      snapshot: 'snapshot-with-indices',
      wait_for_completion: true,
      include_global_state: false,
      ignore_unavailable: false,
      indices: 'logs-*,metrics-*',
    });
  });
});
