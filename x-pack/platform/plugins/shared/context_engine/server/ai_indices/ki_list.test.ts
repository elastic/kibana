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
            _source: {
              type: 'playbook',
              title: 'Refund playbook',
              description: 'Verify the order first.',
              attributes: { source_label: 'Google Drive', version: 1 },
            },
          },
          {
            _id: 'ki-2',
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
        from: 0,
        size: 25,
      })
    ).resolves.toEqual({
      total: 2,
      total_all: 6,
      counts_by_type: [
        { type: 'playbook', count: 1 },
        { type: 'policy', count: 1 },
        { type: 'faq', count: 4 },
      ],
      kis: [
        {
          ki_id: 'ki-1',
          type: 'playbook',
          title: 'Refund playbook',
          source_label: 'Google Drive',
          version: 'v1',
        },
        {
          ki_id: 'ki-2',
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
        from: 0,
        size: 10,
        type: 'playbook',
      })
    ).resolves.toEqual(
      expect.objectContaining({
        total: 1,
        total_all: 6,
        counts_by_type: [
          { type: 'playbook', count: 1 },
          { type: 'policy', count: 1 },
          { type: 'faq', count: 4 },
        ],
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
        from: 0,
        size: 25,
      })
    ).resolves.toEqual({
      kis: [],
      total: 0,
      total_all: 0,
      counts_by_type: [],
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
