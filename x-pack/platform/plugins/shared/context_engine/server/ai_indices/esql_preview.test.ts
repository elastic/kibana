/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { countEsqlRows, previewEsqlQuery } from './esql_preview';

describe('previewEsqlQuery', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('returns the row count and a zipped sample', async () => {
    esClient.esql.query.mockImplementation(async ({ query }) => {
      if (query.includes('STATS row_count')) {
        return { columns: [{ name: 'row_count', type: 'long' }], values: [[42]] } as any;
      }
      return {
        columns: [
          { name: 'subject', type: 'text' },
          { name: 'priority', type: 'keyword' },
        ],
        values: [
          ['Cannot log in', 'high'],
          ['Billing question', 'low'],
        ],
      } as any;
    });

    const result = await previewEsqlQuery(esClient, 'FROM tickets', 2);

    expect(result).toEqual({
      row_count: 42,
      sample_rows: [
        { subject: 'Cannot log in', priority: 'high' },
        { subject: 'Billing question', priority: 'low' },
      ],
    });
  });

  it('runs the count and the sample as two independent queries, capping only the sample', async () => {
    esClient.esql.query.mockResolvedValue({ columns: [], values: [] } as any);

    await previewEsqlQuery(esClient, 'FROM tickets | WHERE status == "open"', 5);

    const queries = esClient.esql.query.mock.calls.map(([params]) => params.query);
    expect(queries).toEqual([
      expect.stringContaining('STATS row_count = COUNT(*)'),
      expect.stringContaining('LIMIT 5'),
    ]);
    expect(queries[0]).not.toContain('LIMIT 5');
    expect(queries[1]).not.toContain('STATS row_count');
  });

  it('defaults the row count to 0 when the count query returns nothing usable', async () => {
    esClient.esql.query.mockResolvedValue({ columns: [], values: [] } as any);

    const result = await previewEsqlQuery(esClient, 'FROM tickets', 5);

    expect(result.row_count).toBe(0);
  });
});

describe('countEsqlRows', () => {
  it('returns the row count from a single STATS query', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockResolvedValue({
      columns: [{ name: 'row_count', type: 'long' }],
      values: [[128]],
    } as any);

    const count = await countEsqlRows(esClient, 'FROM traces-*');

    expect(count).toBe(128);
    expect(esClient.esql.query).toHaveBeenCalledWith({
      query: expect.stringContaining('STATS row_count = COUNT(*)'),
    });
  });

  it('defaults to 0 when the response carries no usable count', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockResolvedValue({ columns: [], values: [] } as any);

    expect(await countEsqlRows(esClient, 'FROM traces-*')).toBe(0);
  });
});
