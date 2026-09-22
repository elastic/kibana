/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestMock } from '../../../test/helpers';
import { routeDependencies, RouterMock } from '../../../test/helpers';
import { addInternalBasePath } from '..';
import { registerIndicesRoutes } from './register_indices_routes';
import { paramsSchema, registerVectorCountRoute } from './register_vector_count_route';

describe('[Index management API Routes] vector count', () => {
  const router = new RouterMock();

  const hasPrivileges = router.getMockESApiFn('security.hasPrivileges');
  const getIndicesStats = router.getMockESApiFnAsInternalUser('indices.stats');

  const mockRequest: RequestMock = {
    method: 'get',
    path: addInternalBasePath('/indices/{indexName}/vector_count'),
    params: { indexName: 'my_index' },
  };

  beforeAll(() => {
    registerVectorCountRoute({ ...routeDependencies, router });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    hasPrivileges.mockResolvedValue({ has_all_requested: true });
  });

  it('sums the dense and sparse vector counts across shards', async () => {
    getIndicesStats.mockResolvedValue({
      _shards: { total: 1, successful: 1, failed: 0 },
      indices: {
        my_index: {
          shards: {
            '0': [
              {
                dense_vector: { value_count: 100 },
                sparse_vector: { value_count: 25 },
              },
            ],
          },
        },
      },
    });

    await expect(router.runRequest(mockRequest)).resolves.toEqual({
      body: { vectorCount: 125 },
    });

    expect(getIndicesStats).toHaveBeenCalledWith({
      expand_wildcards: 'none',
      index: 'my_index',
      level: 'shards',
      metric: ['dense_vector', 'sparse_vector'],
      filter_path: [
        '_shards',
        'indices.*.shards.*.dense_vector.value_count',
        'indices.*.shards.*.sparse_vector.value_count',
      ],
    });
  });

  it('counts each logical shard once when multiple copies report vectors', async () => {
    getIndicesStats.mockResolvedValue({
      _shards: { total: 2, successful: 2, failed: 0 },
      indices: {
        my_index: {
          shards: {
            // the indexing shard and a search shard of the same logical shard
            '0': [{ dense_vector: { value_count: 100 } }, { dense_vector: { value_count: 90 } }],
            // a cold shard where only a search copy remains
            '1': [{ sparse_vector: { value_count: 10 } }],
          },
        },
      },
    });

    await expect(router.runRequest(mockRequest)).resolves.toEqual({
      body: { vectorCount: 110 },
    });
  });

  it('treats missing vector stats as zero', async () => {
    getIndicesStats.mockResolvedValue({
      _shards: { total: 1, successful: 1, failed: 0 },
    });

    await expect(router.runRequest(mockRequest)).resolves.toEqual({
      body: { vectorCount: 0 },
    });
  });

  it('reports the count as unavailable when not all shards responded', async () => {
    getIndicesStats.mockResolvedValue({
      _shards: { total: 3, successful: 2, failed: 0 },
      indices: {
        my_index: {
          shards: { '0': [{ dense_vector: { value_count: 100 } }] },
        },
      },
    });

    await expect(router.runRequest(mockRequest)).resolves.toEqual({
      body: { vectorCount: null },
    });
  });

  it('reports the count as unavailable when the caller lacks the monitor privilege', async () => {
    hasPrivileges.mockResolvedValue({ has_all_requested: false });

    await expect(router.runRequest(mockRequest)).resolves.toEqual({
      body: { vectorCount: null },
    });

    // the stats themselves are read with elevated privileges, so they must not be requested at all
    expect(getIndicesStats).not.toHaveBeenCalled();
  });

  it('denies rather than grants when the privilege check itself fails', async () => {
    hasPrivileges.mockRejectedValue(new Error('boom'));

    await expect(router.runRequest(mockRequest)).resolves.toEqual({
      body: { vectorCount: null },
    });

    expect(getIndicesStats).not.toHaveBeenCalled();
  });

  describe('index name validation', () => {
    const validate = (indexName: string) => () => paramsSchema.validate({ indexName });

    it.each(['my_index', '.ds-logs-generic-default-000001'])('accepts %s', (indexName) => {
      expect(validate(indexName)).not.toThrow();
    });

    // the privilege check reads the name as a single resource, so anything Elasticsearch would
    // expand into a different set of indices has to be refused before the elevated read happens
    it.each([
      ['a comma-separated list', 'logs-foo,secret-bar'],
      ['a wildcard', 'logs-*'],
      ['the _all shorthand', '_all'],
      ['an exclusion pattern', '-logs-foo'],
      ['date math', '<logs-{now/d}>'],
      ['a remote cluster target', 'remote:secret-bar'],
    ])('rejects %s', (_, indexName) => {
      expect(validate(indexName)).toThrow();
    });
  });

  describe('registration', () => {
    const registeredGetPaths = (isVectorCountEnabled: boolean) => {
      const indicesRouter = new RouterMock();
      const registerGet = jest.spyOn(indicesRouter, 'get');

      registerIndicesRoutes({
        ...routeDependencies,
        config: { ...routeDependencies.config, isVectorCountEnabled },
        router: indicesRouter,
      });

      return registerGet.mock.calls.map(([{ path }]) => path);
    };

    it('registers the route on project types where the vector count is enabled', () => {
      expect(registeredGetPaths(true)).toContain(mockRequest.path);
    });

    it('leaves the route unregistered everywhere else', () => {
      expect(registeredGetPaths(false)).not.toContain(mockRequest.path);
    });
  });
});
