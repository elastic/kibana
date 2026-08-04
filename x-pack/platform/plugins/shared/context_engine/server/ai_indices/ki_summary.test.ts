/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { KI_OTHERS_TYPE } from '../../common/ki_type_counts';
import { getKiCountByTypeQuery, getKiSummary } from './ki_summary';

describe('ki_summary', () => {
  it('builds a count-by-type query for the destination', () => {
    expect(getKiCountByTypeQuery('ai-index-idx-sample-ki')).toBe(
      'FROM ai-index-idx-sample-ki | STATS count = COUNT(*) BY type | INLINE STATS total = SUM(count) | SORT count DESC | LIMIT 5'
    );
  });

  it('returns total and per-type counts from the ES|QL response', async () => {
    const esClient = {
      esql: {
        query: jest.fn().mockResolvedValue({
          columns: [{ name: 'type' }, { name: 'count' }, { name: 'total' }],
          values: [
            ['index_metadata', 10, 25],
            ['document', 8, 25],
            ['detection', 7, 25],
          ],
        }),
      },
    } as unknown as ElasticsearchClient;

    await expect(getKiSummary(esClient, 'ai-index-idx-sample-ki')).resolves.toEqual({
      count: 25,
      countsByType: [
        { type: 'index_metadata', count: 10 },
        { type: 'document', count: 8 },
        { type: 'detection', count: 7 },
      ],
    });
  });

  it('returns zero when the response has no rows', async () => {
    const esClient = {
      esql: {
        query: jest.fn().mockResolvedValue({
          columns: [{ name: 'type' }, { name: 'count' }, { name: 'total' }],
          values: [],
        }),
      },
    } as unknown as ElasticsearchClient;

    await expect(getKiSummary(esClient, 'ai-index-idx-sample-ki')).resolves.toEqual({
      count: 0,
      countsByType: [],
    });
  });

  it('groups overflow type counts into others', async () => {
    const esClient = {
      esql: {
        query: jest.fn().mockResolvedValue({
          columns: [{ name: 'type' }, { name: 'count' }, { name: 'total' }],
          values: [
            ['faq', 6, 21],
            ['policy', 5, 21],
            ['playbook', 4, 21],
            ['detection', 3, 21],
            ['document', 2, 21],
          ],
        }),
      },
    } as unknown as ElasticsearchClient;

    await expect(getKiSummary(esClient, 'ai-index-idx-sample-ki')).resolves.toEqual({
      count: 21,
      countsByType: [
        { type: 'faq', count: 6 },
        { type: 'policy', count: 5 },
        { type: 'playbook', count: 4 },
        { type: 'detection', count: 3 },
        { type: KI_OTHERS_TYPE, count: 3 },
      ],
    });
  });
});
