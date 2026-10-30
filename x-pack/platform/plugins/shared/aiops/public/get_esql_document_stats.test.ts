/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsqlDocumentCountQuery, getEsqlDocumentCountStats } from './get_esql_document_stats';

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
    const esql = jest.fn().mockResolvedValue({
      rawResponse: {
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
      search: { esql },
      timeFieldName: '@timestamp',
      earliest: Date.parse('2024-01-01T10:12:00.000Z'),
      latest: Date.parse('2024-01-01T11:20:00.000Z'),
      intervalMs: HALF_HOUR,
    });

    expect(esql).toHaveBeenCalledWith(
      expect.objectContaining({
        kibanaQueryContext: {
          timeRange: { from: '2024-01-01T10:12:00.000Z', to: '2024-01-01T11:20:00.000Z' },
        },
      }),
      expect.anything()
    );
    expect(totalCount).toBe(11);
    expect(documentCountStats.buckets).toEqual({
      [Date.parse('2024-01-01T10:00:00.000Z')]: 4,
      [Date.parse('2024-01-01T10:30:00.000Z')]: 0,
      [Date.parse('2024-01-01T11:00:00.000Z')]: 7,
    });
  });
});
