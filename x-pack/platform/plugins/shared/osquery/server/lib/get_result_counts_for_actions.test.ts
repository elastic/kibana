/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { getResultCountsForActions } from './get_result_counts_for_actions';

const createMockEsClient = (searchResponse: object): ElasticsearchClient =>
  ({
    search: jest.fn().mockResolvedValue(searchResponse),
  } as unknown as ElasticsearchClient);

describe('getResultCountsForActions', () => {
  it('returns empty map when no action IDs provided', async () => {
    const esClient = createMockEsClient({});
    const result = await getResultCountsForActions(esClient, []);

    expect(result.size).toBe(0);
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('returns result counts for action IDs with responses', async () => {
    const esClient = createMockEsClient({
      aggregations: {
        action_ids: {
          buckets: [
            {
              key: 'action-1',
              doc_count: 3,
              rows_count: { value: 42 },
              responses: {
                buckets: [
                  { key: 'success', doc_count: 2 },
                  { key: 'error', doc_count: 1 },
                ],
              },
            },
            {
              key: 'action-2',
              doc_count: 1,
              rows_count: { value: 10 },
              responses: {
                buckets: [{ key: 'success', doc_count: 1 }],
              },
            },
          ],
        },
      },
    });

    const result = await getResultCountsForActions(esClient, ['action-1', 'action-2']);

    expect(result.get('action-1')).toEqual({
      totalRows: 42,
      respondedAgents: 3,
      successfulAgents: 2,
      errorAgents: 1,
    });
    expect(result.get('action-2')).toEqual({
      totalRows: 10,
      respondedAgents: 1,
      successfulAgents: 1,
      errorAgents: 0,
    });
  });

  it('fills in zeros for action IDs without responses', async () => {
    const esClient = createMockEsClient({
      aggregations: {
        action_ids: {
          buckets: [
            {
              key: 'action-1',
              doc_count: 1,
              rows_count: { value: 5 },
              responses: {
                buckets: [{ key: 'success', doc_count: 1 }],
              },
            },
          ],
        },
      },
    });

    const result = await getResultCountsForActions(esClient, ['action-1', 'action-missing']);

    expect(result.get('action-1')).toEqual({
      totalRows: 5,
      respondedAgents: 1,
      successfulAgents: 1,
      errorAgents: 0,
    });
    expect(result.get('action-missing')).toEqual({
      totalRows: 0,
      respondedAgents: 0,
      successfulAgents: 0,
      errorAgents: 0,
    });
  });

  it('uses the correct index with namespace', async () => {
    const esClient = createMockEsClient({
      aggregations: { action_ids: { buckets: [] } },
    });

    await getResultCountsForActions(esClient, ['action-1'], 'production');

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'logs-osquery_manager.action.responses-production',
      })
    );
  });

  it('batches requests when action IDs exceed 1000', async () => {
    const actionIds = Array.from({ length: 1500 }, (_, i) => `action-${i}`);

    const esClient = createMockEsClient({
      aggregations: { action_ids: { buckets: [] } },
    });

    await getResultCountsForActions(esClient, actionIds);

    expect(esClient.search).toHaveBeenCalledTimes(2);

    const firstCallArgs = (esClient.search as jest.Mock).mock.calls[0][0];
    expect(firstCallArgs.aggs.action_ids.terms.size).toBe(1000);

    const secondCallArgs = (esClient.search as jest.Mock).mock.calls[1][0];
    expect(secondCallArgs.aggs.action_ids.terms.size).toBe(500);
  });

  it('merges results from multiple batches', async () => {
    const actionIds = Array.from({ length: 1500 }, (_, i) => `action-${i}`);

    const esClient = {
      search: jest
        .fn()
        .mockResolvedValueOnce({
          aggregations: {
            action_ids: {
              buckets: [
                {
                  key: 'action-0',
                  doc_count: 1,
                  rows_count: { value: 10 },
                  responses: { buckets: [{ key: 'success', doc_count: 1 }] },
                },
              ],
            },
          },
        })
        .mockResolvedValueOnce({
          aggregations: {
            action_ids: {
              buckets: [
                {
                  key: 'action-1000',
                  doc_count: 2,
                  rows_count: { value: 20 },
                  responses: { buckets: [{ key: 'success', doc_count: 2 }] },
                },
              ],
            },
          },
        }),
    } as unknown as ElasticsearchClient;

    const result = await getResultCountsForActions(esClient, actionIds);

    expect(result.get('action-0')).toEqual({
      totalRows: 10,
      respondedAgents: 1,
      successfulAgents: 1,
      errorAgents: 0,
    });
    expect(result.get('action-1000')).toEqual({
      totalRows: 20,
      respondedAgents: 2,
      successfulAgents: 2,
      errorAgents: 0,
    });
    expect(result.size).toBe(1500);
  });

  it('handles empty aggregation buckets', async () => {
    const esClient = createMockEsClient({
      aggregations: { action_ids: { buckets: [] } },
    });

    const result = await getResultCountsForActions(esClient, ['action-1']);

    expect(result.get('action-1')).toEqual({
      totalRows: 0,
      respondedAgents: 0,
      successfulAgents: 0,
      errorAgents: 0,
    });
  });

  it('handles missing aggregations gracefully', async () => {
    const esClient = createMockEsClient({});

    const result = await getResultCountsForActions(esClient, ['action-1']);

    expect(result.get('action-1')).toEqual({
      totalRows: 0,
      respondedAgents: 0,
      successfulAgents: 0,
      errorAgents: 0,
    });
  });
});
