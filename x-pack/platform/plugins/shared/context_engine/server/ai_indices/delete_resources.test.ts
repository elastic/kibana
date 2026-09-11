/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
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
  const esClient = {
    indices: { deleteDataStream, delete: deleteIndex },
  } as unknown as ElasticsearchClient;
  const logger = { warn } as unknown as Logger;

  const deleteBackingStore = (dest: AiIndexDest) =>
    deleteBackingStoreResource({
      esClient,
      dest,
      logger,
      aiIndexId: 'my-ai-index',
    });

  beforeEach(() => {
    deleteDataStream.mockReset();
    deleteIndex.mockReset();
    warn.mockReset();
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
      expect(warn).toHaveBeenCalled();
    }
  );
});
