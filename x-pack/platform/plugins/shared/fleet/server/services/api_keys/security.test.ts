/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_KEY_INVALIDATION_BATCH_SIZE } from '../../constants';
import { appContextService } from '../app_context';
import { invalidateAPIKeys } from './security';

jest.mock('../app_context');

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;

describe('invalidateAPIKeys', () => {
  let invalidateAsInternalUserMock: jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();
    invalidateAsInternalUserMock = jest.fn();
    mockedAppContextService.getSecurity.mockReturnValue({
      authc: {
        apiKeys: {
          invalidateAsInternalUser: invalidateAsInternalUserMock,
        },
      },
    } as any);
  });

  it('returns empty result immediately without calling security API when ids is empty', async () => {
    const res = await invalidateAPIKeys([]);

    expect(res).toEqual({
      invalidated_api_keys: [],
      previously_invalidated_api_keys: [],
      error_count: 0,
    });
    expect(invalidateAsInternalUserMock).not.toHaveBeenCalled();
  });

  it('throws when security plugin is not available', async () => {
    mockedAppContextService.getSecurity.mockReturnValue(null as any);

    await expect(invalidateAPIKeys(['key1'])).rejects.toThrow('Missing security plugin');
    await expect(invalidateAPIKeys([])).rejects.toThrow('Missing security plugin');
  });

  it('returns null immediately if the first chunk invalidateAsInternalUser call returns null', async () => {
    const ids = Array.from({ length: 2500 }, (_, i) => `key-${i}`);

    invalidateAsInternalUserMock.mockResolvedValueOnce(null);

    const res = await invalidateAPIKeys(ids);

    expect(res).toBeNull();
    expect(invalidateAsInternalUserMock).toHaveBeenCalledTimes(1);
  });

  it('returns partial aggregated result and stops processing when a later chunk returns null', async () => {
    const ids = Array.from({ length: 3000 }, (_, i) => `key-${i}`);

    invalidateAsInternalUserMock
      .mockResolvedValueOnce({
        invalidated_api_keys: ['key-1'],
        previously_invalidated_api_keys: ['key-prev-1'],
        error_count: 0,
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        invalidated_api_keys: ['key-should-not-be-reached'],
        previously_invalidated_api_keys: [],
        error_count: 0,
      });

    const res = await invalidateAPIKeys(ids);

    expect(res).toEqual({
      invalidated_api_keys: ['key-1'],
      previously_invalidated_api_keys: ['key-prev-1'],
      error_count: 0,
    });
    expect(invalidateAsInternalUserMock).toHaveBeenCalledTimes(2);
  });

  it('chunks ids into API_KEY_INVALIDATION_BATCH_SIZE batches and makes N separate calls', async () => {
    const totalKeys = API_KEY_INVALIDATION_BATCH_SIZE * 2 + 500; // e.g. 2500 keys -> 3 chunks
    const ids = Array.from({ length: totalKeys }, (_, i) => `key-${i}`);

    invalidateAsInternalUserMock.mockImplementation(
      async ({ ids: batchIds }: { ids: string[] }) => ({
        invalidated_api_keys: batchIds,
        previously_invalidated_api_keys: [],
        error_count: 0,
      })
    );

    const res = await invalidateAPIKeys(ids);

    const expectedChunkCount = Math.ceil(totalKeys / API_KEY_INVALIDATION_BATCH_SIZE); // 3
    expect(invalidateAsInternalUserMock).toHaveBeenCalledTimes(expectedChunkCount);

    expect(invalidateAsInternalUserMock).toHaveBeenNthCalledWith(1, {
      ids: ids.slice(0, API_KEY_INVALIDATION_BATCH_SIZE),
    });
    expect(invalidateAsInternalUserMock).toHaveBeenNthCalledWith(2, {
      ids: ids.slice(API_KEY_INVALIDATION_BATCH_SIZE, API_KEY_INVALIDATION_BATCH_SIZE * 2),
    });
    expect(invalidateAsInternalUserMock).toHaveBeenNthCalledWith(3, {
      ids: ids.slice(API_KEY_INVALIDATION_BATCH_SIZE * 2),
    });

    expect(res?.invalidated_api_keys).toEqual(ids);
  });

  it('handles an exact multiple of API_KEY_INVALIDATION_BATCH_SIZE without creating a trailing empty chunk', async () => {
    const totalKeys = API_KEY_INVALIDATION_BATCH_SIZE * 2; // e.g. 2000 keys -> exactly 2 chunks
    const ids = Array.from({ length: totalKeys }, (_, i) => `key-${i}`);

    invalidateAsInternalUserMock.mockImplementation(
      async ({ ids: batchIds }: { ids: string[] }) => ({
        invalidated_api_keys: batchIds,
        previously_invalidated_api_keys: [],
        error_count: 0,
      })
    );

    const res = await invalidateAPIKeys(ids);

    expect(invalidateAsInternalUserMock).toHaveBeenCalledTimes(2);
    expect(invalidateAsInternalUserMock).toHaveBeenNthCalledWith(1, {
      ids: ids.slice(0, API_KEY_INVALIDATION_BATCH_SIZE),
    });
    expect(invalidateAsInternalUserMock).toHaveBeenNthCalledWith(2, {
      ids: ids.slice(API_KEY_INVALIDATION_BATCH_SIZE, API_KEY_INVALIDATION_BATCH_SIZE * 2),
    });
    expect(res?.invalidated_api_keys.length).toBe(2000);
  });

  it('correctly merges results across multiple chunks (invalidated, previously_invalidated, error_count, error_details)', async () => {
    const ids = Array.from({ length: 2500 }, (_, i) => `key-${i}`);

    invalidateAsInternalUserMock
      .mockResolvedValueOnce({
        invalidated_api_keys: ['key-0', 'key-1'],
        previously_invalidated_api_keys: ['prev-0'],
        error_count: 1,
        error_details: [{ type: 'error_type_1', reason: 'failed 1' }],
      })
      .mockResolvedValueOnce({
        invalidated_api_keys: ['key-1000'],
        previously_invalidated_api_keys: ['prev-1000', 'prev-1001'],
        error_count: 0,
      })
      .mockResolvedValueOnce({
        invalidated_api_keys: [],
        previously_invalidated_api_keys: [],
        error_count: 2,
        error_details: [
          { type: 'error_type_2', reason: 'failed 2' },
          { type: 'error_type_3', reason: 'failed 3' },
        ],
      });

    const res = await invalidateAPIKeys(ids);

    expect(res).toEqual({
      invalidated_api_keys: ['key-0', 'key-1', 'key-1000'],
      previously_invalidated_api_keys: ['prev-0', 'prev-1000', 'prev-1001'],
      error_count: 3,
      error_details: [
        { type: 'error_type_1', reason: 'failed 1' },
        { type: 'error_type_2', reason: 'failed 2' },
        { type: 'error_type_3', reason: 'failed 3' },
      ],
    });
  });

  it('omits error_details from the result when total error_count is 0 across all chunks', async () => {
    const ids = Array.from({ length: 1500 }, (_, i) => `key-${i}`);

    invalidateAsInternalUserMock
      .mockResolvedValueOnce({
        invalidated_api_keys: ['key-chunk-1'],
        previously_invalidated_api_keys: ['prev-chunk-1'],
        error_count: 0,
      })
      .mockResolvedValueOnce({
        invalidated_api_keys: ['key-chunk-2'],
        previously_invalidated_api_keys: ['prev-chunk-2'],
        error_count: 0,
      });

    const res = await invalidateAPIKeys(ids);

    expect(invalidateAsInternalUserMock).toHaveBeenCalledTimes(2);
    expect(res).toEqual({
      invalidated_api_keys: ['key-chunk-1', 'key-chunk-2'],
      previously_invalidated_api_keys: ['prev-chunk-1', 'prev-chunk-2'],
      error_count: 0,
    });
    expect(res).not.toHaveProperty('error_details');
  });

  it('executes chunk requests strictly sequentially, not concurrently', async () => {
    const ids = Array.from({ length: 2500 }, (_, i) => `key-${i}`);
    const deferreds: Array<{ resolve: (val: any) => void }> = [];
    let maxConcurrent = 0;
    let currentConcurrent = 0;

    invalidateAsInternalUserMock.mockImplementation(() => {
      currentConcurrent++;
      maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
      return new Promise((resolve) => {
        deferreds.push({
          resolve: (val: any) => {
            currentConcurrent--;
            resolve(val);
          },
        });
      });
    });

    const invalidatePromise = invalidateAPIKeys(ids);

    await new Promise((resolve) => process.nextTick(resolve));
    expect(invalidateAsInternalUserMock).toHaveBeenCalledTimes(1);
    expect(maxConcurrent).toBe(1);

    deferreds[0].resolve({
      invalidated_api_keys: ['chunk-1'],
      previously_invalidated_api_keys: [],
      error_count: 0,
    });

    await new Promise((resolve) => process.nextTick(resolve));
    expect(invalidateAsInternalUserMock).toHaveBeenCalledTimes(2);
    expect(maxConcurrent).toBe(1);

    deferreds[1].resolve({
      invalidated_api_keys: ['chunk-2'],
      previously_invalidated_api_keys: [],
      error_count: 0,
    });

    await new Promise((resolve) => process.nextTick(resolve));
    expect(invalidateAsInternalUserMock).toHaveBeenCalledTimes(3);
    expect(maxConcurrent).toBe(1);

    deferreds[2].resolve({
      invalidated_api_keys: ['chunk-3'],
      previously_invalidated_api_keys: [],
      error_count: 0,
    });

    const res = await invalidatePromise;

    expect(res).toEqual({
      invalidated_api_keys: ['chunk-1', 'chunk-2', 'chunk-3'],
      previously_invalidated_api_keys: [],
      error_count: 0,
    });
    expect(maxConcurrent).toBe(1);
  });

  it('rethrows error if underlying invalidateAsInternalUser fails', async () => {
    const ids = Array.from({ length: 2500 }, (_, i) => `key-${i}`);

    invalidateAsInternalUserMock
      .mockResolvedValueOnce({
        invalidated_api_keys: ['key-0'],
        previously_invalidated_api_keys: [],
        error_count: 0,
      })
      .mockRejectedValueOnce(new Error('ES connection failure'));

    await expect(invalidateAPIKeys(ids)).rejects.toThrow('ES connection failure');
    expect(invalidateAsInternalUserMock).toHaveBeenCalledTimes(2);
  });
});
