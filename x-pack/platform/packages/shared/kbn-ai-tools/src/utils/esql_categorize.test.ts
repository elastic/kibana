/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import { buildCategorizeWithSampleQuery, categorizeWithNoiseExclusion } from './esql_categorize';

const categorizeResponse = (values: unknown[][]): ESQLSearchResponse =>
  ({
    columns: [
      { name: 'count', type: 'long' },
      { name: 'sample', type: 'keyword' },
      { name: 'pattern', type: 'keyword' },
    ],
    values,
  } as unknown as ESQLSearchResponse);

const createTracedEsClient = (esql: jest.Mock) =>
  ({
    esql,
  } as unknown as TracedElasticsearchClient);

describe('buildCategorizeWithSampleQuery', () => {
  it('defaults to regex CATEGORIZE, rare-tail truncation, and no SAMPLE at probability 1', () => {
    const query = buildCategorizeWithSampleQuery({
      indices: 'logs-*',
      field: 'message',
      samplingProbability: 1,
    });

    expect(query).toBe(
      'FROM logs-* | STATS count = COUNT(*), `sample` = TOP(message::KEYWORD, 1, "desc") BY pattern = CATEGORIZE(message) | SORT count ASC | LIMIT 1000'
    );
  });

  it('emits token output format when requested', () => {
    const query = buildCategorizeWithSampleQuery({
      indices: 'logs-*',
      field: 'message',
      samplingProbability: 1,
      outputFormat: 'tokens',
    });

    expect(query).toContain('CATEGORIZE(message, {"output_format": "tokens"})');
  });

  it('adds SAMPLE before STATS when probability < 1', () => {
    const query = buildCategorizeWithSampleQuery({
      indices: 'logs-*',
      field: 'message',
      samplingProbability: 0.25,
    });

    expect(query).toContain('| SAMPLE 0.25 | STATS');
  });

  it('emits a post-STATS count threshold', () => {
    const query = buildCategorizeWithSampleQuery({
      indices: 'logs-*',
      field: 'message',
      samplingProbability: 1,
      countThreshold: 42,
    });

    expect(query).toContain('| WHERE count > 42 | SORT count ASC | LIMIT 1000');
  });

  it('chains full-text NOT MATCH exclusions before STATS', () => {
    const query = buildCategorizeWithSampleQuery({
      indices: 'logs-*',
      field: 'body.text',
      samplingProbability: 1,
      outputFormat: 'tokens',
      excludeTokens: ['request completed', 'metadata updated'],
    });

    expect(query).toContain(
      'WHERE NOT MATCH(body.text, "request completed", {"operator": "AND"}) AND NOT MATCH(body.text, "metadata updated", {"operator": "AND"})'
    );
    expect(query.indexOf('NOT MATCH')).toBeLessThan(query.indexOf('STATS'));
  });

  it('honors an explicit row limit', () => {
    const query = buildCategorizeWithSampleQuery({
      indices: 'logs-*',
      field: 'message',
      samplingProbability: 1,
      limit: 10,
    });

    expect(query).toContain('| SORT count ASC | LIMIT 10');
  });
});

describe('categorizeWithNoiseExclusion', () => {
  it('excludes the noisy head then recategorizes the residual at full probability', async () => {
    const esql = jest
      .fn()
      .mockResolvedValueOnce(categorizeResponse([[960, 'request completed', 'request completed']]))
      .mockResolvedValueOnce(
        categorizeResponse([[4, 'disk quota exceeded', 'disk quota exceeded']])
      );

    const rows = await categorizeWithNoiseExclusion({
      esClient: createTracedEsClient(esql),
      indices: 'logs-*',
      field: 'message',
      total: 1000,
      samplingProbability: 1,
    });

    expect(esql).toHaveBeenCalledTimes(2);
    const pass1 = esql.mock.calls[0][1].query;
    expect(pass1).toContain('CATEGORIZE(message, {"output_format": "tokens"})');
    expect(pass1).toContain('| WHERE count > 10 | SORT count ASC | LIMIT 1000');
    expect(esql.mock.calls[0][0]).toBe('categorize_noise_exclusion_head');
    const pass2 = esql.mock.calls[1][1].query;
    expect(pass2).toContain('NOT MATCH(message, "request completed", {"operator": "AND"})');
    expect(pass2).toContain('| SORT count ASC | LIMIT 1000');
    expect(pass2).not.toContain('SAMPLE');
    expect(esql.mock.calls[1][0]).toBe('categorize_noise_exclusion_rare');
    expect(rows).toEqual([
      { count: 960, pattern: 'request completed', sample: 'request completed' },
      { count: 4, pattern: 'disk quota exceeded', sample: 'disk quota exceeded' },
    ]);
  });

  it('normalizes head and tail counts back to population estimates', async () => {
    const esql = jest
      .fn()
      .mockResolvedValueOnce(categorizeResponse([[90, 'noise', 'noise']]))
      .mockResolvedValueOnce(categorizeResponse([[7, 'rare', 'rare']]));

    const rows = await categorizeWithNoiseExclusion({
      esClient: createTracedEsClient(esql),
      indices: 'logs-*',
      field: 'message',
      total: 1000,
      samplingProbability: 0.1,
    });

    expect(rows).toEqual([
      { count: 900, pattern: 'noise', sample: 'noise' },
      { count: 7, pattern: 'rare', sample: 'rare' },
    ]);
  });

  it('falls back to a plain sampled categorize when no head clears the threshold', async () => {
    const esql = jest
      .fn()
      .mockResolvedValueOnce(categorizeResponse([]))
      .mockResolvedValueOnce(categorizeResponse([[16, 'error one', 'error']]));

    const rows = await categorizeWithNoiseExclusion({
      esClient: createTracedEsClient(esql),
      indices: 'logs-*',
      field: 'message',
      total: 1_000_000,
      samplingProbability: 0.1,
    });

    expect(esql).toHaveBeenCalledTimes(2);
    const plain = esql.mock.calls[1][1].query;
    expect(plain).toContain('| SAMPLE 0.1 |');
    expect(plain).not.toContain('NOT MATCH');
    expect(plain).not.toContain('WHERE count >');
    expect(plain).toContain('| SORT count DESC | LIMIT 1000');
    expect(esql.mock.calls[1][0]).toBe('categorize_noise_exclusion_plain');
    expect(rows).toEqual([{ count: 160, pattern: 'error', sample: 'error one' }]);
  });

  it('re-samples pass 2 when the residual still exceeds the cap', async () => {
    const esql = jest
      .fn()
      .mockResolvedValueOnce(categorizeResponse([[200, 'noise', 'noise']]))
      .mockResolvedValueOnce(categorizeResponse([[3, 'rare', 'rare']]));

    const rows = await categorizeWithNoiseExclusion({
      esClient: createTracedEsClient(esql),
      indices: 'logs-*',
      field: 'message',
      total: 2200,
      samplingProbability: 1,
      maxDocsToSample: 1000,
    });

    const pass2 = esql.mock.calls[1][1].query;
    expect(pass2).toContain('| SAMPLE 0.5 |');
    expect(pass2).toContain('NOT MATCH(message, "noise", {"operator": "AND"})');
    expect(rows).toEqual([
      { count: 200, pattern: 'noise', sample: 'noise' },
      { count: 6, pattern: 'rare', sample: 'rare' },
    ]);
  });

  it('skips pass 2 when counts are exact and the head is the whole population', async () => {
    const esql = jest.fn().mockResolvedValueOnce(categorizeResponse([[100, 'all', 'all']]));

    const rows = await categorizeWithNoiseExclusion({
      esClient: createTracedEsClient(esql),
      indices: 'logs-*',
      field: 'message',
      total: 100,
      samplingProbability: 1,
    });

    expect(esql).toHaveBeenCalledTimes(1);
    expect(rows).toEqual([{ count: 100, pattern: 'all', sample: 'all' }]);
  });

  it('sorts by count descending and dedupes head remnants left by approximate exclusion', async () => {
    const esql = jest
      .fn()
      .mockResolvedValueOnce(categorizeResponse([[500, 'noise', 'noise']]))
      .mockResolvedValueOnce(
        categorizeResponse([
          [8, 'rare', 'rare'],
          [2, 'noise', 'noise'],
        ])
      );

    const rows = await categorizeWithNoiseExclusion({
      esClient: createTracedEsClient(esql),
      indices: 'logs-*',
      field: 'message',
      total: 1000,
      samplingProbability: 1,
    });

    expect(rows).toEqual([
      { count: 500, pattern: 'noise', sample: 'noise' },
      { count: 8, pattern: 'rare', sample: 'rare' },
    ]);
  });

  it('propagates two-pass query errors instead of silently degrading', async () => {
    const esql = jest
      .fn()
      .mockRejectedValueOnce(new Error('circuit_breaking_exception: too much data'));

    await expect(
      categorizeWithNoiseExclusion({
        esClient: createTracedEsClient(esql),
        indices: 'logs-*',
        field: 'message',
        total: 1000,
        samplingProbability: 1,
      })
    ).rejects.toThrow('circuit_breaking_exception');

    expect(esql).toHaveBeenCalledTimes(1);
  });
});
