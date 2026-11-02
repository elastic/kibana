/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { fetchTagUsageData } from './fetch_tag_usage_data';

const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

const makeBucket = (type: string, docCount: number, tagIds: string[]) => ({
  key: type,
  doc_count: docCount,
  nested_ref: {
    tag_references: {
      doc_count: tagIds.length,
      tag_id: { buckets: tagIds.map((id) => ({ key: id, doc_count: 1 })) },
    },
  },
});

const mockSearch = (buckets: ReturnType<typeof makeBucket>[]) => {
  esClient.search.mockResolvedValue({
    aggregations: { by_type: { buckets } },
  } as unknown as Awaited<ReturnType<typeof esClient.search>>);
};

describe('fetchTagUsageData', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('passes kibanaIndices to the ES search query', async () => {
    mockSearch([]);
    await fetchTagUsageData({ esClient, kibanaIndices: ['.kibana_1', '.kibana_2'] });
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ index: ['.kibana_1', '.kibana_2'] })
    );
  });

  it('builds ES query with nested tag filters and aggregations', async () => {
    mockSearch([]);
    await fetchTagUsageData({ esClient, kibanaIndices: ['.kibana'] });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        ignore_unavailable: true,
        filter_path: 'aggregations',
        size: 0,
        query: {
          bool: {
            must: [
              {
                nested: {
                  path: 'references',
                  query: {
                    bool: {
                      must: [{ term: { 'references.type': 'tag' } }],
                    },
                  },
                },
              },
            ],
          },
        },
        aggs: expect.objectContaining({
          by_type: expect.objectContaining({
            terms: { field: 'type' },
          }),
        }),
      })
    );
  });

  it('returns zeroes when no tagged objects exist', async () => {
    mockSearch([]);
    const result = await fetchTagUsageData({ esClient, kibanaIndices: ['.kibana'] });
    expect(result).toEqual({ usedTags: 0, taggedObjects: 0, types: {} });
  });

  it('counts tagged objects and distinct tags for a single type', async () => {
    mockSearch([makeBucket('dashboard', 2, ['tag-1', 'tag-2', 'tag-4'])]);
    const result = await fetchTagUsageData({ esClient, kibanaIndices: ['.kibana'] });
    expect(result).toEqual({
      usedTags: 3,
      taggedObjects: 2,
      types: {
        dashboard: { taggedObjects: 2, usedTags: 3 },
      },
    });
  });

  it('counts distinct tag IDs, not doc_count sums, when the same tag appears on multiple objects of the same type', async () => {
    mockSearch([
      {
        key: 'dashboard',
        doc_count: 3,
        nested_ref: {
          tag_references: {
            doc_count: 5,
            tag_id: {
              buckets: [
                { key: 'tag-1', doc_count: 3 }, // tag-1 on all 3 dashboards
                { key: 'tag-2', doc_count: 2 }, // tag-2 on 2 dashboards
              ],
            },
          },
        },
      },
    ]);
    const result = await fetchTagUsageData({ esClient, kibanaIndices: ['.kibana'] });
    expect(result).toEqual({
      usedTags: 2, // 2 distinct tag IDs, not sum(3+2)=5
      taggedObjects: 3,
      types: { dashboard: { taggedObjects: 3, usedTags: 2 } },
    });
  });

  it('deduplicates shared tags across types in the global usedTags count', async () => {
    // tag-1 is used by both types — must be counted once globally, not twice
    mockSearch([
      makeBucket('dashboard', 2, ['tag-1', 'tag-2', 'tag-4']),
      makeBucket('visualization', 3, ['tag-1', 'tag-3']),
    ]);
    const result = await fetchTagUsageData({ esClient, kibanaIndices: ['.kibana'] });

    expect(result.usedTags).toBe(4); // tag-1, tag-2, tag-3, tag-4
    expect(result.taggedObjects).toBe(5);
    expect(result.types.dashboard).toEqual({ taggedObjects: 2, usedTags: 3 });
    expect(result.types.visualization).toEqual({ taggedObjects: 3, usedTags: 2 });
  });
});
