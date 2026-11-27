/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import { getSigEventsLogPatternsEsql } from './get_log_patterns';

const createEsClient = (
  columns: Array<{ name: string; type: string }> = [{ name: 'message', type: 'text' }]
) => {
  const esql = jest.fn();
  const rawEsqlQuery = jest.fn().mockResolvedValueOnce({ columns, values: [] });

  return {
    esClient: {
      esql,
      client: { esql: { query: rawEsqlQuery } },
    } as unknown as TracedElasticsearchClient,
    esql,
    rawEsqlQuery,
  };
};

const countResponse = (total: number) => ({
  columns: [{ name: 'total', type: 'long' }],
  values: [[total]],
});

const categorizeResponse = (
  values: unknown[][] = [
    [10, 'error one', 'error'],
    [5, 'warn two', 'warn'],
  ]
) => ({
  columns: [
    { name: 'count', type: 'long' },
    { name: 'sample', type: 'keyword' },
    { name: 'pattern', type: 'keyword' },
  ],
  values,
});

describe('getSigEventsLogPatternsEsql', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds ES|QL count and two-pass categorize queries', async () => {
    const { esClient, esql, rawEsqlQuery } = createEsClient([{ name: 'body.text', type: 'text' }]);
    esql
      .mockResolvedValueOnce(countResponse(10))
      .mockResolvedValueOnce(categorizeResponse([[10, 'error one', 'error']]))
      .mockResolvedValueOnce(categorizeResponse([]));

    const result = await getSigEventsLogPatternsEsql({
      esClient,
      samplingSource: 'logs-*',
      start: 100,
      end: 200,
      fields: ['body.text'],
      kql: 'service.name:"checkout"',
    });

    expect(esql.mock.calls[0]).toEqual([
      'count_docs_for_sigevents_log_patterns',
      expect.objectContaining({
        query:
          'FROM logs-* | WHERE @timestamp >= "1970-01-01T00:00:00.100Z" AND @timestamp <= "1970-01-01T00:00:00.200Z" | WHERE KQL("service.name:\\"checkout\\"") | WHERE body.text IS NOT NULL | STATS total = COUNT(*)',
      }),
    ]);
    expect(esql.mock.calls[1]).toEqual([
      'categorize_noise_exclusion_head',
      {
        query:
          'FROM logs-* | WHERE @timestamp >= "1970-01-01T00:00:00.100Z" AND @timestamp <= "1970-01-01T00:00:00.200Z" | WHERE KQL("service.name:\\"checkout\\"") | WHERE body.text IS NOT NULL | STATS count = COUNT(*), `sample` = TOP(body.text::KEYWORD, 1, "desc") BY pattern = CATEGORIZE(body.text, {"output_format": "tokens"}) | WHERE count > 0.1 | SORT count ASC | LIMIT 1000',
      },
    ]);
    expect(esql).toHaveBeenCalledTimes(3);
    expect(rawEsqlQuery).toHaveBeenCalledTimes(1);
    expect(rawEsqlQuery.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        query:
          'SET unmapped_fields = "NULLIFY"; FROM logs-* | WHERE @timestamp >= "1970-01-01T00:00:00.100Z" AND @timestamp <= "1970-01-01T00:00:00.200Z" | KEEP body.text | LIMIT 0',
      })
    );
    expect(result).toEqual([
      { field: 'body.text', pattern: 'error', count: 10, sample: 'error one' },
    ]);
  });

  it('short-circuits when schema returns no eligible text fields', async () => {
    const { esClient, esql } = createEsClient([{ name: 'message', type: 'null' }]);

    const result = await getSigEventsLogPatternsEsql({
      esClient,
      samplingSource: 'logs-*',
      start: 100,
      end: 200,
      fields: ['message'],
    });

    expect(esql).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('sorts by count and deduplicates by sample', async () => {
    const { esClient, esql } = createEsClient([
      { name: 'message', type: 'text' },
      { name: 'body.text', type: 'text' },
    ]);
    esql.mockImplementation(async (operationName: string, { query }: { query: string }) => {
      if (operationName === 'count_docs_for_sigevents_log_patterns') {
        return countResponse(10);
      }
      if (operationName !== 'categorize_noise_exclusion_head') {
        return categorizeResponse([]);
      }
      return query.includes('CATEGORIZE(message')
        ? categorizeResponse([[2, 'same', 'message low']])
        : categorizeResponse([[8, 'same', 'body high']]);
    });

    const result = await getSigEventsLogPatternsEsql({
      esClient,
      samplingSource: 'logs-*',
      start: 100,
      end: 200,
      fields: ['message', 'body.text'],
    });

    expect(result).toEqual([
      { field: 'body.text', pattern: 'body high', count: 8, sample: 'same' },
    ]);
  });

  it('counts each field separately and skips one that no document holds', async () => {
    const { esClient, esql } = createEsClient([
      { name: 'message', type: 'text' },
      { name: 'body.text', type: 'text' },
    ]);
    esql.mockImplementation(async (operationName: string, { query }: { query: string }) => {
      if (operationName === 'count_docs_for_sigevents_log_patterns') {
        return countResponse(query.includes('WHERE message IS NOT NULL') ? 0 : 1_000_000);
      }
      return operationName === 'categorize_noise_exclusion_head'
        ? categorizeResponse([[50_000, 'body sample', 'body pattern']])
        : categorizeResponse([]);
    });

    const result = await getSigEventsLogPatternsEsql({
      esClient,
      samplingSource: 'logs-*',
      start: 100,
      end: 200,
      fields: ['message', 'body.text'],
    });

    const queries = esql.mock.calls.map(([, { query }]) => query).join('\n');
    expect(queries).not.toContain('CATEGORIZE(message');
    expect(queries).toContain('| SAMPLE 0.1 |');
    expect(queries).toContain('| WHERE count > 1000 |');
    expect(result).toEqual([
      { field: 'body.text', pattern: 'body pattern', count: 500_000, sample: 'body sample' },
    ]);
  });

  it('tolerates a TOP sample value returned as a single-item array', async () => {
    const { esClient, esql } = createEsClient();
    esql
      .mockResolvedValueOnce(countResponse(10))
      .mockResolvedValueOnce(categorizeResponse([[3, ['array sample'], 'error']]))
      .mockResolvedValueOnce(categorizeResponse([]));

    const result = await getSigEventsLogPatternsEsql({
      esClient,
      samplingSource: 'logs-*',
      start: 100,
      end: 200,
      fields: ['message'],
    });

    expect(result).toEqual([
      { field: 'message', pattern: 'error', count: 3, sample: 'array sample' },
    ]);
  });
});
