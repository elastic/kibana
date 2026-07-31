/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import {
  buildCategorizeWithSampleQuery,
  categorizeWithNoiseExclusion,
  esqlSupportsTwoPass,
} from './esql_categorize';

const categorizeResponse = (values: unknown[][]): ESQLSearchResponse =>
  ({
    columns: [
      { name: 'count', type: 'long' },
      { name: 'sample', type: 'keyword' },
      { name: 'pattern', type: 'keyword' },
    ],
    values,
  } as unknown as ESQLSearchResponse);

describe('buildCategorizeWithSampleQuery', () => {
  it('defaults to regex CATEGORIZE with no SORT/LIMIT and no SAMPLE at probability 1', () => {
    const query = buildCategorizeWithSampleQuery({
      indices: 'logs-*',
      field: 'message',
      samplingProbability: 1,
    });

    expect(query).toBe(
      'FROM logs-* | STATS count = COUNT(*), `sample` = TOP(message::KEYWORD, 1, "desc") BY pattern = CATEGORIZE(message)'
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

    expect(query).toContain('| WHERE count > 42');
    expect(query).not.toContain('SORT');
    expect(query).not.toContain('LIMIT');
  });

  it('chains full-text NOT MATCH exclusions before STATS, ANDed with KQL', () => {
    const query = buildCategorizeWithSampleQuery({
      indices: 'logs-*',
      field: 'body.text',
      samplingProbability: 1,
      kql: 'service.name:"checkout"',
      outputFormat: 'tokens',
      excludeTokens: ['request completed', 'metadata updated'],
    });

    expect(query).toContain(
      'WHERE KQL("service.name:\\"checkout\\"") AND NOT MATCH(body.text, "request completed", {"operator": "AND"}) AND NOT MATCH(body.text, "metadata updated", {"operator": "AND"})'
    );
    // Exclusion sits before STATS on the indexed field.
    expect(query.indexOf('NOT MATCH')).toBeLessThan(query.indexOf('STATS'));
  });

  it('skips empty exclusion tokens', () => {
    const query = buildCategorizeWithSampleQuery({
      indices: 'logs-*',
      field: 'message',
      samplingProbability: 1,
      excludeTokens: ['', 'real token'],
    });

    expect(query).toContain('NOT MATCH(message, "real token", {"operator": "AND"})');
    expect(query.match(/NOT MATCH/g)).toHaveLength(1);
  });

  it('reproduces the legacy SORT count DESC | LIMIT shape only when opted in', () => {
    const query = buildCategorizeWithSampleQuery({
      indices: 'logs-*',
      field: 'message',
      samplingProbability: 1,
      sortByCountDesc: true,
      limit: 10,
    });

    expect(query).toContain('| SORT count DESC | LIMIT 10');
  });
});

describe('categorizeWithNoiseExclusion', () => {
  it('excludes the noisy head then recategorizes the residual at full probability', async () => {
    const run = jest
      .fn()
      .mockResolvedValueOnce(categorizeResponse([[960, 'request completed', 'request completed']]))
      .mockResolvedValueOnce(
        categorizeResponse([[4, 'disk quota exceeded', 'disk quota exceeded']])
      );

    const rows = await categorizeWithNoiseExclusion({
      indices: 'logs-*',
      field: 'message',
      total: 1000,
      samplingProbability: 1,
      run,
    });

    expect(run).toHaveBeenCalledTimes(2);
    // Pass 1: token categorize + relative threshold (0.01 * 1000 * 1 = 10), no SORT/LIMIT.
    const pass1 = run.mock.calls[0][0];
    expect(pass1).toContain('CATEGORIZE(message, {"output_format": "tokens"})');
    expect(pass1).toContain('| WHERE count > 10');
    expect(pass1).not.toContain('SORT');
    // Pass 2: full-probability (no SAMPLE) recategorize excluding the head.
    const pass2 = run.mock.calls[1][0];
    expect(pass2).toContain('NOT MATCH(message, "request completed", {"operator": "AND"})');
    expect(pass2).not.toContain('SAMPLE');
    expect(rows).toEqual([
      { count: 960, pattern: 'request completed', sample: 'request completed' },
      { count: 4, pattern: 'disk quota exceeded', sample: 'disk quota exceeded' },
    ]);
  });

  it('normalizes head and tail counts back to population estimates', async () => {
    // p1 = 0.1: head appears at 90 in the sample -> 900 in the population;
    // residual (100) fits under the cap so p2 = 1 and the tail count is exact.
    const run = jest
      .fn()
      .mockResolvedValueOnce(categorizeResponse([[90, 'noise', 'noise']]))
      .mockResolvedValueOnce(categorizeResponse([[7, 'rare', 'rare']]));

    const rows = await categorizeWithNoiseExclusion({
      indices: 'logs-*',
      field: 'message',
      total: 1000,
      samplingProbability: 0.1,
      run,
    });

    expect(rows).toEqual([
      { count: 900, pattern: 'noise', sample: 'noise' },
      { count: 7, pattern: 'rare', sample: 'rare' },
    ]);
  });

  it('falls back to a plain sampled categorize when no head clears the threshold', async () => {
    const run = jest
      .fn()
      .mockResolvedValueOnce(categorizeResponse([]))
      .mockResolvedValueOnce(categorizeResponse([[16, 'error one', 'error']]));

    const rows = await categorizeWithNoiseExclusion({
      indices: 'logs-*',
      field: 'message',
      total: 1_000_000,
      samplingProbability: 0.1,
      run,
    });

    expect(run).toHaveBeenCalledTimes(2);
    const plain = run.mock.calls[1][0];
    // No exclusion, no post-STATS threshold, but still sampled.
    expect(plain).toContain('| SAMPLE 0.1 |');
    expect(plain).not.toContain('NOT MATCH');
    expect(plain).not.toContain('WHERE count >');
    expect(rows).toEqual([{ count: 160, pattern: 'error', sample: 'error one' }]);
  });

  it('re-samples pass 2 when the residual still exceeds the cap', async () => {
    // total 2200, head 200 -> residual 2000 > cap 1000 -> p2 = 0.5.
    const run = jest
      .fn()
      .mockResolvedValueOnce(categorizeResponse([[200, 'noise', 'noise']]))
      .mockResolvedValueOnce(categorizeResponse([[3, 'rare', 'rare']]));

    const rows = await categorizeWithNoiseExclusion({
      indices: 'logs-*',
      field: 'message',
      total: 2200,
      samplingProbability: 1,
      maxDocsToSample: 1000,
      run,
    });

    const pass2 = run.mock.calls[1][0];
    expect(pass2).toContain('| SAMPLE 0.5 |');
    expect(pass2).toContain('NOT MATCH(message, "noise", {"operator": "AND"})');
    // Tail count normalized back up by 1 / p2.
    expect(rows).toEqual([
      { count: 200, pattern: 'noise', sample: 'noise' },
      { count: 6, pattern: 'rare', sample: 'rare' },
    ]);
  });

  it('skips pass 2 when counts are exact and the head is the whole population', async () => {
    const run = jest.fn().mockResolvedValueOnce(categorizeResponse([[100, 'all', 'all']]));

    const rows = await categorizeWithNoiseExclusion({
      indices: 'logs-*',
      field: 'message',
      total: 100,
      samplingProbability: 1,
      run,
    });

    expect(run).toHaveBeenCalledTimes(1);
    expect(rows).toEqual([{ count: 100, pattern: 'all', sample: 'all' }]);
  });

  it('sorts by count descending and dedupes head remnants left by approximate exclusion', async () => {
    // Approximate NOT MATCH can leave a smaller-count remnant of a head pattern
    // in pass 2; dedupe keeps the larger head representative.
    const run = jest
      .fn()
      .mockResolvedValueOnce(categorizeResponse([[500, 'noise', 'noise']]))
      .mockResolvedValueOnce(
        categorizeResponse([
          [8, 'rare', 'rare'],
          [2, 'noise', 'noise'],
        ])
      );

    const rows = await categorizeWithNoiseExclusion({
      indices: 'logs-*',
      field: 'message',
      total: 1000,
      samplingProbability: 1,
      run,
    });

    expect(rows).toEqual([
      { count: 500, pattern: 'noise', sample: 'noise' },
      { count: 8, pattern: 'rare', sample: 'rare' },
    ]);
  });

  it('degrades to a legacy single-pass categorize when the two-pass query is rejected', async () => {
    const run = jest
      .fn()
      // Pass 1 rejected, e.g. an older ES without CATEGORIZE_OPTIONS/MATCH options.
      .mockRejectedValueOnce(new Error('verification_exception: Invalid option [output_format]'))
      // Legacy fallback (regex categorize, no options, no exclusion) succeeds.
      .mockResolvedValueOnce(categorizeResponse([[7, 'legacy sample', 'legacy']]));

    const rows = await categorizeWithNoiseExclusion({
      indices: 'logs-*',
      field: 'message',
      total: 1000,
      samplingProbability: 1,
      run,
    });

    expect(run).toHaveBeenCalledTimes(2);
    const fallback = run.mock.calls[1][0];
    expect(fallback).not.toContain('output_format');
    expect(fallback).not.toContain('NOT MATCH');
    expect(rows).toEqual([{ count: 7, pattern: 'legacy', sample: 'legacy sample' }]);
  });

  it('runs a single legacy categorize (no speculative query) when two-pass is unsupported', async () => {
    const run = jest
      .fn()
      .mockResolvedValueOnce(categorizeResponse([[7, 'legacy sample', 'legacy']]));

    const rows = await categorizeWithNoiseExclusion({
      indices: 'logs-*',
      field: 'message',
      total: 1000,
      samplingProbability: 1,
      twoPassSupported: false,
      run,
    });

    // No head/exclusion round-trip: straight to the legacy regex categorize.
    expect(run).toHaveBeenCalledTimes(1);
    const query = run.mock.calls[0][0];
    expect(query).not.toContain('output_format');
    expect(query).not.toContain('NOT MATCH');
    expect(query).not.toContain('WHERE count >');
    expect(rows).toEqual([{ count: 7, pattern: 'legacy', sample: 'legacy sample' }]);
  });
});

describe('esqlSupportsTwoPass', () => {
  const createClient = (capabilities: jest.Mock) =>
    ({ capabilities } as unknown as ElasticsearchClient);

  it('resolves true only when the cluster reports supported: true', async () => {
    const capabilities = jest.fn().mockResolvedValue({ supported: true });

    await expect(esqlSupportsTwoPass(createClient(capabilities))).resolves.toBe(true);
    expect(capabilities).toHaveBeenCalledWith(
      {
        method: 'POST',
        path: '/_query',
        capabilities: ['categorize_options', 'match_function_options'],
      },
      undefined
    );
  });

  it('resolves false when support is partial (false) or unknown (null)', async () => {
    await expect(
      esqlSupportsTwoPass(createClient(jest.fn().mockResolvedValue({ supported: false })))
    ).resolves.toBe(false);
    await expect(
      esqlSupportsTwoPass(createClient(jest.fn().mockResolvedValue({ supported: null })))
    ).resolves.toBe(false);
  });

  it('resolves false without caching when the capabilities check fails', async () => {
    const capabilities = jest
      .fn()
      .mockRejectedValueOnce(new Error('capabilities unavailable'))
      .mockResolvedValueOnce({ supported: true });
    const client = createClient(capabilities);

    await expect(esqlSupportsTwoPass(client)).resolves.toBe(false);
    // A transient failure is not cached, so a later call can recover.
    await expect(esqlSupportsTwoPass(client)).resolves.toBe(true);
    expect(capabilities).toHaveBeenCalledTimes(2);
  });

  it('memoizes a successful result per client', async () => {
    const capabilities = jest.fn().mockResolvedValue({ supported: true });
    const client = createClient(capabilities);

    await Promise.all([esqlSupportsTwoPass(client), esqlSupportsTwoPass(client)]);

    expect(capabilities).toHaveBeenCalledTimes(1);
  });
});
