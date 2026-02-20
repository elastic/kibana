/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { createGcsRepository } from './gcs_repository';

const log = new ToolingLog({
  level: 'silent',
  writeTo: {
    write: () => {},
  },
});

describe('createGcsRepository', () => {
  it('throws when bucket is missing', () => {
    const repository = createGcsRepository({ bucket: '' });

    expect(() => repository.validate()).toThrow('GCS repository bucket is required');
  });

  it('passes validation for a valid config', () => {
    const repository = createGcsRepository({ bucket: 'snapshot-bucket' });

    expect(() => repository.validate()).not.toThrow();
  });

  it('registers a GCS repository in Elasticsearch', async () => {
    const createRepository = jest.fn().mockResolvedValue(undefined);
    const esClient = {
      snapshot: {
        createRepository,
      },
    } as unknown as Client;
    const repository = createGcsRepository({
      bucket: 'snapshot-bucket',
      basePath: 'base/path',
      client: 'default',
    });

    await repository.register({ esClient, log, repoName: 'test-repo' });

    expect(createRepository).toHaveBeenCalledWith({
      name: 'test-repo',
      body: {
        type: 'gcs',
        settings: {
          bucket: 'snapshot-bucket',
          base_path: 'base/path',
          client: 'default',
        },
      },
    });
  });

  it('omits optional settings when undefined', async () => {
    const createRepository = jest.fn().mockResolvedValue(undefined);
    const esClient = {
      snapshot: {
        createRepository,
      },
    } as unknown as Client;
    const repository = createGcsRepository({ bucket: 'snapshot-bucket' });

    await repository.register({ esClient, log, repoName: 'test-repo' });

    expect(createRepository).toHaveBeenCalledWith({
      name: 'test-repo',
      body: {
        type: 'gcs',
        settings: {
          bucket: 'snapshot-bucket',
        },
      },
    });
  });
});
