/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { ES_AI_INDEX_PATH, MAX_AI_INDICES } from '../../common/constants';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import { deleteBackingStoreResource } from './delete_resources';

const makeResponseError = (statusCode: number) =>
  new errors.ResponseError({
    meta: {
      aborted: false,
      attempts: 1,
      connection: null,
      context: null,
      name: 'response_error',
      request: {} as never,
    },
    warnings: [],
    body: 'error',
    statusCode,
  });

describe('deleteBackingStoreResource', () => {
  const deleteDataStream = jest.fn();
  const deleteIndex = jest.fn();
  const warn = jest.fn();
  const registryRequest = jest.fn();
  const esClient = {
    asCurrentUser: {
      indices: { deleteDataStream, delete: deleteIndex },
    },
    asInternalUser: {
      transport: { request: registryRequest },
    },
  } as unknown as IScopedClusterClient;
  const logger = { warn } as unknown as Logger;

  const listResponse = (results: Array<{ id: string; space: string }> = []) => ({
    count: results.length,
    results,
  });

  const deleteBackingStore = (dest: AiIndexDest, spaceId = 'default') =>
    deleteBackingStoreResource({
      esClient,
      dest,
      logger,
      aiIndexId: 'my-ai-index',
      spaceId,
    });

  beforeEach(() => {
    deleteDataStream.mockReset();
    deleteIndex.mockReset();
    warn.mockReset();
    registryRequest.mockReset();
    registryRequest.mockResolvedValue(listResponse());
  });

  describe('data_stream dest', () => {
    const dest: AiIndexDest = { type: 'data_stream', value: 'ai-index-ds-customer_support' };

    it('deletes the data stream and returns null', async () => {
      deleteDataStream.mockResolvedValue({ acknowledged: true });

      await expect(deleteBackingStore(dest)).resolves.toBeNull();

      expect(deleteDataStream).toHaveBeenCalledWith({ name: dest.value });
      expect(deleteIndex).not.toHaveBeenCalled();
    });

    it('returns null when the data stream is already gone (404)', async () => {
      deleteDataStream.mockRejectedValue(makeResponseError(404));

      await expect(deleteBackingStore(dest)).resolves.toBeNull();
      expect(warn).not.toHaveBeenCalled();
    });

    it('does not forward a stringified ES response body in the error string', async () => {
      deleteDataStream.mockRejectedValue(
        new errors.ResponseError({
          meta: {
            aborted: false,
            attempts: 1,
            connection: null,
            context: null,
            name: 'response_error',
            request: {} as never,
          },
          warnings: [],
          body: { unexpected: 'shape', secret: 'internal-detail' },
          statusCode: 500,
        })
      );

      const result = await deleteBackingStore(dest);

      expect(result).toMatch(/Failed to delete the backing store/);
      expect(result).not.toContain('internal-detail');
      expect(result).toContain('Elasticsearch returned an unexpected error');
    });

    it('returns an error string for non-404 ES errors', async () => {
      deleteDataStream.mockRejectedValue(makeResponseError(403));

      await expect(deleteBackingStore(dest)).resolves.toMatch(
        /Failed to delete the backing store 'ai-index-ds-customer_support'/
      );
      expect(warn).toHaveBeenCalled();
    });
  });

  describe('index dest', () => {
    const dest: AiIndexDest = { type: 'index', value: 'my-backing-index' };

    it('deletes the index and returns null', async () => {
      deleteIndex.mockResolvedValue({ acknowledged: true });

      await expect(deleteBackingStore(dest)).resolves.toBeNull();

      expect(deleteIndex).toHaveBeenCalledWith({ index: dest.value });
      expect(deleteDataStream).not.toHaveBeenCalled();
    });

    it('returns null when the index is already gone (404)', async () => {
      deleteIndex.mockRejectedValue(makeResponseError(404));

      await expect(deleteBackingStore(dest)).resolves.toBeNull();
      expect(warn).not.toHaveBeenCalled();
    });

    it('returns an error string for non-404 ES errors', async () => {
      deleteIndex.mockRejectedValue(makeResponseError(500));

      await expect(deleteBackingStore(dest)).resolves.toMatch(
        /Failed to delete the backing store 'my-backing-index'/
      );
      expect(warn).toHaveBeenCalled();
    });
  });

  it.each(['ai-index-ds-*', 'ai-index-ds-a,ai-index-ds-b'])(
    'refuses to delete index-pattern dest %s',
    async (value) => {
      await expect(deleteBackingStore({ type: 'data_stream', value })).resolves.toMatch(
        /index pattern/
      );
      expect(deleteDataStream).not.toHaveBeenCalled();
      expect(deleteIndex).not.toHaveBeenCalled();
      expect(registryRequest).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalled();
    }
  );

  it('skips dest delete when another AI index still uses the dest', async () => {
    registryRequest.mockResolvedValue(
      listResponse([{ id: 'other_space_index', space: 'default' }])
    );

    await expect(
      deleteBackingStore({ type: 'data_stream', value: 'ai-index-ds-customer_support' })
    ).resolves.toEqual(
      expect.stringMatching(
        /Did not delete the backing store 'ai-index-ds-customer_support': it is still used by other AI indices \(other_space_index\)/
      )
    );

    // No space: a backing store may be shared across spaces.
    expect(registryRequest).toHaveBeenCalledWith({
      method: 'GET',
      path: ES_AI_INDEX_PATH,
      querystring: { dest: 'ai-index-ds-customer_support', size: MAX_AI_INDICES },
    });
    expect(deleteDataStream).not.toHaveBeenCalled();
    expect(deleteIndex).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });

  it('keeps the backing store when the same logical id in another space uses it', async () => {
    registryRequest.mockResolvedValue(listResponse([{ id: 'my-ai-index', space: 'marketing' }]));

    await expect(
      deleteBackingStore({ type: 'data_stream', value: 'ai-index-ds-customer_support' })
    ).resolves.toMatch(/marketing\/my-ai-index/);
    expect(deleteDataStream).not.toHaveBeenCalled();
    expect(deleteIndex).not.toHaveBeenCalled();
  });

  it('excludes only the deleted entry itself, by id and space', async () => {
    registryRequest.mockResolvedValue(
      listResponse([
        { id: 'my-ai-index', space: 'marketing' },
        { id: 'my-ai-index', space: 'default' },
      ])
    );

    await expect(
      deleteBackingStore(
        { type: 'data_stream', value: 'ai-index-ds-customer_support' },
        'marketing'
      )
    ).resolves.toMatch(/\(default\/my-ai-index\)/);
    expect(deleteDataStream).not.toHaveBeenCalled();
  });
});
