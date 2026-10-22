/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient, IScopedClusterClient } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { ensureMemorySliceIndex, resolveMemoryUserSlice } from './memory_slice';

const responseError = (statusCode: number, type?: string) =>
  new errors.ResponseError({
    statusCode,
    body: type ? { error: { type } } : {},
    warnings: null,
    meta: {} as never,
  });

describe('resolveMemoryUserSlice', () => {
  const getCurrentUser = jest.fn();
  const coreStart = coreMock.createStart();
  coreStart.security.authc.getCurrentUser = getCurrentUser;

  const run = () =>
    resolveMemoryUserSlice({
      request: httpServerMock.createKibanaRequest(),
      esClient: { asCurrentUser: {} } as unknown as IScopedClusterClient,
      getCoreStart: async () => coreStart,
    });

  it('returns the caller profile uid', async () => {
    getCurrentUser.mockReturnValue({ username: 'alice', profile_uid: 'u_alice' });

    await expect(run()).resolves.toBe('u_alice');
  });

  it('rejects a caller without a user identity', async () => {
    getCurrentUser.mockReturnValue({ username: 'alice' });

    await expect(run()).rejects.toThrow('Cannot store user memory without a user identity.');
  });
});

describe('ensureMemorySliceIndex', () => {
  const getSettings = jest.fn();
  const create = jest.fn();
  const esClient = { indices: { getSettings, create } } as unknown as ElasticsearchClient;
  const index = 'ai-index-idx-memory';

  const run = () => ensureMemorySliceIndex({ esClient, index });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts an existing slice-enabled index', async () => {
    getSettings.mockResolvedValue({ [index]: { settings: { 'index.slice.enabled': 'true' } } });

    await expect(run()).resolves.toBeUndefined();
    expect(getSettings).toHaveBeenCalledWith({
      index,
      name: 'index.slice.enabled',
      flat_settings: true,
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('creates a missing index with slices enabled', async () => {
    getSettings.mockRejectedValue(responseError(404));

    await run();

    expect(create).toHaveBeenCalledWith({ index, settings: { 'index.slice.enabled': true } });
  });

  it('ignores a concurrent create', async () => {
    getSettings.mockRejectedValue(responseError(404));
    create.mockRejectedValue(responseError(400, 'resource_already_exists_exception'));

    await expect(run()).resolves.toBeUndefined();
  });

  it('rejects an existing index without slices', async () => {
    getSettings.mockResolvedValue({ [index]: { settings: {} } });

    await expect(run()).rejects.toThrow(
      "Memory index 'ai-index-idx-memory' must have index.slice.enabled set to true."
    );
    expect(create).not.toHaveBeenCalled();
  });
});
