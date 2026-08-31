/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { getKis } from './ki_list';

const allKisAggregation = {
  doc_count: 6,
  counts_by_type: {
    buckets: [
      { key: 'playbook', doc_count: 1 },
      { key: 'policy', doc_count: 1 },
      { key: 'faq', doc_count: 4 },
    ],
  },
};

const BACKING_INDEX = 'ai-index-idx-sample';

describe('ki_list', () => {
  const search = jest.fn();
  const esClient = { search } as unknown as ElasticsearchClient;

  beforeEach(() => {
    search.mockReset();
  });

  it('returns paginated KIs sorted by timestamp', async () => {
    search.mockResolvedValue({
      hits: {
        total: { value: 2 },
        hits: [
          {
            _id: 'ki-1',
            _index: BACKING_INDEX,
            _source: {
              type: 'playbook',
              title: 'Refund playbook',
            },
          },
          {
            _id: 'ki-2',
            _index: BACKING_INDEX,
            _source: {
              type: 'policy',
              title: 'Refund policy',
              description: 'Do not issue refunds outside the SLA window.',
            },
          },
        ],
      },
      aggregations: {
        all_kis: allKisAggregation,
      },
    });

    await expect(
      getKis(esClient, {
        destValue: 'ai-index-idx-sample',
        size: 25,
      })
    ).resolves.toEqual({
      total: 2,
      summary: {
        total: 6,
        counts_by_type: [
          { type: 'playbook', count: 1 },
          { type: 'policy', count: 1 },
          { type: 'faq', count: 4 },
        ],
      },
      kis: [
        {
          id: 'ki-1',
          index: BACKING_INDEX,
          type: 'playbook',
          title: 'Refund playbook',
        },
        {
          id: 'ki-2',
          index: BACKING_INDEX,
          type: 'policy',
          title: 'Refund policy',
        },
      ],
    });

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'ai-index-idx-sample',
        from: 0,
        size: 25,
        query: { match_all: {} },
        sort: [
          { '@timestamp': { order: 'desc', unmapped_type: 'date' } },
          { _doc: { order: 'desc' } },
        ],
        aggs: {
          all_kis: {
            global: {},
            aggs: {
              counts_by_type: {
                terms: {
                  field: 'type',
                  size: 5,
                  order: { _count: 'desc' },
                },
              },
            },
          },
        },
      })
    );
  });

  it('filters list hits by type but keeps unfiltered type counts', async () => {
    search.mockResolvedValue({
      hits: {
        total: { value: 1 },
        hits: [
          {
            _id: 'ki-1',
            _index: BACKING_INDEX,
            _source: {
              type: 'playbook',
              title: 'Refund playbook',
              description: 'Verify the order first.',
            },
          },
        ],
      },
      aggregations: {
        all_kis: allKisAggregation,
      },
    });

    await expect(
      getKis(esClient, {
        destValue: 'ai-index-idx-sample',
        size: 10,
        type: 'playbook',
      })
    ).resolves.toEqual(
      expect.objectContaining({
        total: 1,
        summary: {
          total: 6,
          counts_by_type: [
            { type: 'playbook', count: 1 },
            { type: 'policy', count: 1 },
            { type: 'faq', count: 4 },
          ],
        },
      })
    );

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            filter: [{ term: { type: 'playbook' } }],
          },
        },
      })
    );
  });

  it('includes KIs with missing type or title so total matches the rendered row count', async () => {
    search.mockResolvedValue({
      hits: {
        total: { value: 3 },
        hits: [
          {
            _id: 'ki-complete',
            _index: BACKING_INDEX,
            _source: {
              type: 'playbook',
              title: 'Complete KI',
            },
          },
          {
            _id: 'ki-missing-type',
            _index: BACKING_INDEX,
            _source: {
              title: 'Missing type',
            },
          },
          {
            _id: 'ki-missing-title',
            _index: BACKING_INDEX,
            _source: {
              type: 'policy',
            },
          },
        ],
      },
      aggregations: {
        all_kis: allKisAggregation,
      },
    });

    await expect(
      getKis(esClient, {
        destValue: 'ai-index-idx-sample',
        size: 25,
      })
    ).resolves.toEqual({
      total: 3,
      summary: {
        total: 6,
        counts_by_type: [
          { type: 'playbook', count: 1 },
          { type: 'policy', count: 1 },
          { type: 'faq', count: 4 },
        ],
      },
      kis: [
        { id: 'ki-complete', index: BACKING_INDEX, type: 'playbook', title: 'Complete KI' },
        { id: 'ki-missing-type', index: BACKING_INDEX, title: 'Missing type' },
        { id: 'ki-missing-title', index: BACKING_INDEX, type: 'policy' },
      ],
    });
  });

  it('returns summary stats without fetching rows when size is 0', async () => {
    search.mockResolvedValue({
      hits: {
        total: { value: 6 },
        hits: [],
      },
      aggregations: {
        all_kis: allKisAggregation,
      },
    });

    await expect(
      getKis(esClient, {
        destValue: 'ai-index-idx-sample',
        size: 0,
      })
    ).resolves.toEqual({
      kis: [],
      total: 6,
      summary: {
        total: 6,
        counts_by_type: [
          { type: 'playbook', count: 1 },
          { type: 'policy', count: 1 },
          { type: 'faq', count: 4 },
        ],
      },
    });

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 0,
      })
    );
  });

  it('returns an empty list when the backing store has no documents', async () => {
    search.mockResolvedValue({
      hits: {
        total: { value: 0 },
        hits: [],
      },
      aggregations: {
        all_kis: {
          doc_count: 0,
          counts_by_type: { buckets: [] },
        },
      },
    });

    await expect(
      getKis(esClient, {
        destValue: 'ai-index-idx-missing',
        size: 25,
      })
    ).resolves.toEqual({
      kis: [],
      total: 0,
      summary: {
        total: 0,
        counts_by_type: [],
      },
    });

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'ai-index-idx-missing',
        ignore_unavailable: true,
        allow_no_indices: true,
      })
    );
  });
});
