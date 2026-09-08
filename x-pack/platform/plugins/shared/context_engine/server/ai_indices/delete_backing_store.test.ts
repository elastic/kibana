/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import { deleteAiIndexBackingStore } from './delete_backing_store';

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

describe('deleteAiIndexBackingStore', () => {
  const deleteDataStream = jest.fn();
  const deleteIndex = jest.fn();
  const esClient = {
    indices: { deleteDataStream, delete: deleteIndex },
  } as unknown as ElasticsearchClient;

  beforeEach(() => {
    deleteDataStream.mockReset();
    deleteIndex.mockReset();
  });

  describe('data_stream dest', () => {
    const dest: AiIndexDest = { type: 'data_stream', value: 'ai-ds-customer_support*' };

    it('calls deleteDataStream with the dest value', async () => {
      deleteDataStream.mockResolvedValue({ acknowledged: true });

      await deleteAiIndexBackingStore(esClient, dest);

      expect(deleteDataStream).toHaveBeenCalledWith({ name: dest.value });
      expect(deleteIndex).not.toHaveBeenCalled();
    });

    it('resolves without throwing when the data stream is already gone (404)', async () => {
      deleteDataStream.mockRejectedValue(makeResponseError(404));

      await expect(deleteAiIndexBackingStore(esClient, dest)).resolves.toBeUndefined();
    });

    it('rethrows non-404 ES errors', async () => {
      deleteDataStream.mockRejectedValue(makeResponseError(403));

      await expect(deleteAiIndexBackingStore(esClient, dest)).rejects.toThrow();
    });
  });

  describe('index dest', () => {
    const dest: AiIndexDest = { type: 'index', value: 'my-backing-index' };

    it('calls delete with the dest value', async () => {
      deleteIndex.mockResolvedValue({ acknowledged: true });

      await deleteAiIndexBackingStore(esClient, dest);

      expect(deleteIndex).toHaveBeenCalledWith({ index: dest.value });
      expect(deleteDataStream).not.toHaveBeenCalled();
    });

    it('resolves without throwing when the index is already gone (404)', async () => {
      deleteIndex.mockRejectedValue(makeResponseError(404));

      await expect(deleteAiIndexBackingStore(esClient, dest)).resolves.toBeUndefined();
    });

    it('rethrows non-404 ES errors', async () => {
      deleteIndex.mockRejectedValue(makeResponseError(500));

      await expect(deleteAiIndexBackingStore(esClient, dest)).rejects.toThrow();
    });
  });
});
