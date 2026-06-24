/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { deleteByQueryBestEffort } from './delete_by_query_best_effort';

describe('deleteByQueryBestEffort', () => {
  it('returns the deleted document count', async () => {
    const esClient = {
      deleteByQuery: jest.fn().mockResolvedValue({ deleted: 7, total: 7 }),
    } as unknown as ElasticsearchClient;

    const deleted = await deleteByQueryBestEffort({
      esClient,
      index: '.significant_events-events',
      query: { term: { stream_names: 'logs.nginx' } },
    });

    expect(deleted).toBe(7);
    expect(esClient.deleteByQuery).toHaveBeenCalledWith({
      index: '.significant_events-events',
      conflicts: 'proceed',
      query: { term: { stream_names: 'logs.nginx' } },
    });
  });

  it('returns 0 when the index is missing', async () => {
    const esClient = {
      deleteByQuery: jest.fn().mockRejectedValue(
        new errors.ResponseError({
          statusCode: 404,
          body: {},
          headers: {},
          warnings: [],
          meta: {} as never,
        })
      ),
    } as unknown as ElasticsearchClient;

    const deleted = await deleteByQueryBestEffort({
      esClient,
      index: '.significant_events-events',
      query: { match_all: {} },
    });

    expect(deleted).toBe(0);
  });

  it('rethrows non-404 errors', async () => {
    const esClient = {
      deleteByQuery: jest.fn().mockRejectedValue(new Error('cluster blocked')),
    } as unknown as ElasticsearchClient;

    await expect(
      deleteByQueryBestEffort({
        esClient,
        index: '.significant_events-events',
        query: { match_all: {} },
      })
    ).rejects.toThrow('cluster blocked');
  });
});
