/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getESQLResults } from '@kbn/esql-utils';
import type { ISearchGeneric } from '@kbn/search-types';
import { buildEsqlDocumentCountQuery, getEsqlDocumentCountStats } from './get_esql_document_stats';

jest.mock('@kbn/esql-utils', () => ({
  ...jest.requireActual('@kbn/esql-utils'),
  getESQLResults: jest.fn(),
}));

const HALF_HOUR = 30 * 60 * 1000;

describe('get_esql_document_stats', () => {
  it('builds a BUCKET query using the interval in milliseconds', () => {
    const query = buildEsqlDocumentCountQuery({
      esql: 'FROM logs-* | WHERE host == "a"',
      timeFieldName: '@timestamp',
      intervalMs: HALF_HOUR,
    });

    expect(query).toContain('WHERE host == "a"');
    expect(query).toContain(
      'STATS Count = COUNT(*) BY Bucket = BUCKET(`@timestamp`, 1800000 milliseconds)'
    );
  });

  it('returns interval aligned buckets with empty buckets filled in', async () => {
    (getESQLResults as jest.Mock).mockResolvedValue({
      response: {
        columns: [
          { name: 'Count', type: 'long' },
          { name: 'Bucket', type: 'date' },
        ],
        values: [
          [4, '2024-01-01T10:00:00.000Z'],
          [7, '2024-01-01T11:00:00.000Z'],
        ],
      },
    });

    const { totalCount, documentCountStats } = await getEsqlDocumentCountStats({
      esql: 'FROM logs-*',
      search: jest.fn() as unknown as ISearchGeneric,
      timeFieldName: '@timestamp',
      earliest: Date.parse('2024-01-01T10:12:00.000Z'),
      latest: Date.parse('2024-01-01T11:20:00.000Z'),
      intervalMs: HALF_HOUR,
    });

    expect(getESQLResults).toHaveBeenCalledWith(
      expect.objectContaining({
        timeRange: { from: '2024-01-01T10:12:00.000Z', to: '2024-01-01T11:20:00.000Z' },
      })
    );
    expect(totalCount).toBe(11);
    expect(documentCountStats.buckets).toEqual({
      [Date.parse('2024-01-01T10:00:00.000Z')]: 4,
      [Date.parse('2024-01-01T10:30:00.000Z')]: 0,
      [Date.parse('2024-01-01T11:00:00.000Z')]: 7,
    });
  });
});
