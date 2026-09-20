/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { LogPattern } from '../../../../../common/services/semantic_log_search/types';
import {
  collectCandidates,
  mergeAndDedupe,
  normalizeCounts,
  selectRerankCandidates,
} from './collect_candidates';
import type { EsqlSearchScope } from './run_queries';

const BASE_SCOPE: EsqlSearchScope = {
  target: 'logs-*',
  startIso: '2024-01-01T00:00:00.000Z',
  endIso: '2024-01-02T00:00:00.000Z',
};

const makePattern = (pattern: string, count: number): LogPattern => ({
  field: 'message',
  pattern,
  count,
  firstSeen: '2024-01-01T00:00:00.000Z',
  lastSeen: '2024-01-01T01:00:00.000Z',
  sample: { message: `sample for ${pattern}` },
});

const makePatternResponse = (
  rows: Array<{ pattern: string; count: number }>
): ESQLSearchResponse => ({
  columns: [
    { name: 'count', type: 'long' },
    { name: 'first_seen', type: 'date' },
    { name: 'last_seen', type: 'date' },
    { name: 'sample', type: 'keyword' },
    { name: 'pattern', type: 'keyword' },
  ],
  values: rows.map(({ pattern, count }) => [
    count,
    '2024-01-01T00:00:00.000Z',
    '2024-01-01T01:00:00.000Z',
    `sample for ${pattern}`,
    pattern,
  ]),
});

const emptyResponse: ESQLSearchResponse = { columns: [], values: [] };

// ---------------------------------------------------------------------------
// normalizeCounts
// ---------------------------------------------------------------------------

describe('normalizeCounts', () => {
  it('scales counts by 1/probability for sampled passes', () => {
    const patterns = [makePattern('Pattern A', 100), makePattern('Pattern B', 50)];
    const normalized = normalizeCounts(patterns, 0.5);
    expect(normalized[0].count).toBe(200);
    expect(normalized[1].count).toBe(100);
  });

  it('returns patterns unchanged when probability is 1', () => {
    const patterns = [makePattern('Pattern A', 100)];
    const normalized = normalizeCounts(patterns, 1);
    expect(normalized[0].count).toBe(100);
  });

  it('rounds to the nearest integer', () => {
    const patterns = [makePattern('Pattern A', 1)];
    const normalized = normalizeCounts(patterns, 0.3);
    expect(Number.isInteger(normalized[0].count)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// mergeAndDedupe
// ---------------------------------------------------------------------------

describe('mergeAndDedupe', () => {
  it('keeps the higher-count entry when the same pattern appears in both sets', () => {
    const head = [makePattern('Shared', 200)];
    const rare = [makePattern('Shared', 10)];
    const merged = mergeAndDedupe(head, rare);
    expect(merged).toHaveLength(1);
    expect(merged[0].count).toBe(200);
  });

  it('keeps rare entry when it has a higher count than head', () => {
    const head = [makePattern('Shared', 5)];
    const rare = [makePattern('Shared', 50)];
    const merged = mergeAndDedupe(head, rare);
    expect(merged).toHaveLength(1);
    expect(merged[0].count).toBe(50);
  });

  it('keeps all unique patterns from both sets', () => {
    const head = [makePattern('Pattern A', 100)];
    const rare = [makePattern('Pattern B', 10)];
    const merged = mergeAndDedupe(head, rare);
    expect(merged).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// selectRerankCandidates
// ---------------------------------------------------------------------------

describe('selectRerankCandidates', () => {
  it('returns all candidates unchanged when count is at or below the limit', () => {
    const candidates = [makePattern('A', 100), makePattern('B', 50), makePattern('C', 10)];
    expect(selectRerankCandidates(candidates, 3)).toHaveLength(3);
    expect(selectRerankCandidates(candidates, 5)).toHaveLength(3);
  });

  it('returns exactly `limit` items when count exceeds the limit', () => {
    const candidates = Array.from({ length: 1000 }, (_, i) =>
      makePattern(`pattern-${i}`, 1000 - i)
    );
    const result = selectRerankCandidates(candidates, 500);
    expect(result).toHaveLength(500);
  });

  it('includes no duplicates when count exceeds the limit', () => {
    const candidates = Array.from({ length: 1000 }, (_, i) =>
      makePattern(`pattern-${i}`, 1000 - i)
    );
    const result = selectRerankCandidates(candidates, 500);
    const patterns = result.map((p) => p.pattern);
    expect(new Set(patterns).size).toBe(500);
  });

  it('regression: includes the lowest-count pattern (rare tail must not be dropped)', () => {
    // Single DESC-ordered input of 1 000 patterns: a positional prefix slice(0, 500) would keep
    // only the 500 most common, silently discarding the rare tail that carries incident signal.
    const candidates = Array.from({ length: 1000 }, (_, i) =>
      makePattern(`pattern-${i}`, 1000 - i)
    );
    const result = selectRerankCandidates(candidates, 500);
    const lowestCount = Math.min(...result.map((p) => p.count));
    expect(lowestCount).toBe(1);
  });

  it('respects the 20/80 head/rare quota for limit=500', () => {
    const candidates = Array.from({ length: 1000 }, (_, i) =>
      makePattern(`pattern-${i}`, 1000 - i)
    );
    const result = selectRerankCandidates(candidates, 500);
    // headQuota = ceil(500 * 0.2) = 100. Top 100 entries: counts 1000..901.
    const counts = result.map((p) => p.count).sort((a, b) => b - a);
    expect(counts[0]).toBe(1000);
    expect(counts[99]).toBe(901);
    // Bottom 400 entries: counts 400..1.
    expect(counts[100]).toBe(400);
    expect(counts[499]).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// collectCandidates — pass-selection and skip conditions
// ---------------------------------------------------------------------------

describe('collectCandidates', () => {
  it('runs a single unsampled pass for small corpora (≤ 50 000 docs)', async () => {
    // 10 000 docs → getSampleProbability returns 1 → no SAMPLE in query.
    const esqlQuery = jest
      .fn()
      .mockResolvedValue(makePatternResponse([{ pattern: 'Error', count: 100 }]));
    const esClient = { esql: { query: esqlQuery } } as unknown as ElasticsearchClient;

    await collectCandidates({ scope: BASE_SCOPE, total: 10_000, esClient, abortSignal: undefined });

    // Only one categorize call for small corpora.
    expect(esqlQuery).toHaveBeenCalledTimes(1);
    const query = esqlQuery.mock.calls[0][0].query;
    expect(query).not.toContain('SAMPLE');
  });

  it('runs two passes for large corpora (> 50 000 docs)', async () => {
    const headResponse = makePatternResponse([{ pattern: 'Common error', count: 1000 }]);
    const esqlQuery = jest
      .fn()
      .mockResolvedValueOnce(headResponse) // head pass
      .mockResolvedValueOnce(emptyResponse); // rare pass
    const esClient = { esql: { query: esqlQuery } } as unknown as ElasticsearchClient;

    await collectCandidates({
      scope: BASE_SCOPE,
      total: 100_000,
      esClient,
      abortSignal: undefined,
    });

    expect(esqlQuery).toHaveBeenCalledTimes(2);
  });

  it('runs a plain DESC fallback when the head pass returns no patterns', async () => {
    // 100 000 docs → two-pass path. Head returns nothing → fallback DESC pass, not a rare ASC pass.
    const esqlQuery = jest
      .fn()
      .mockResolvedValueOnce(emptyResponse) // head pass (empty)
      .mockResolvedValueOnce(makePatternResponse([{ pattern: 'Pattern', count: 50 }])); // fallback
    const esClient = { esql: { query: esqlQuery } } as unknown as ElasticsearchClient;

    await collectCandidates({
      scope: BASE_SCOPE,
      total: 100_000,
      esClient,
      abortSignal: undefined,
    });

    expect(esqlQuery).toHaveBeenCalledTimes(2);
    const fallbackQuery = esqlQuery.mock.calls[1][0].query;
    // Fallback is a plain DESC pass — no NOT MATCH and no noise threshold.
    expect(fallbackQuery).toContain('SORT count DESC');
    expect(fallbackQuery).not.toContain('NOT MATCH');
  });

  it('always runs the rare pass when the head was sampled, even if the estimated residual is 0', async () => {
    // 100 000 docs, p = 0.5. Head pattern raw count = 50 000 → normalized to 100 000 = total.
    // Residual = 0, but since sampling was used the rare pass must still run.
    const headResponse = makePatternResponse([{ pattern: 'Big pattern', count: 50_000 }]);
    const esqlQuery = jest
      .fn()
      .mockResolvedValueOnce(headResponse) // head pass
      .mockResolvedValueOnce(emptyResponse); // rare pass — must still be called
    const esClient = { esql: { query: esqlQuery } } as unknown as ElasticsearchClient;

    await collectCandidates({
      scope: BASE_SCOPE,
      total: 100_000,
      esClient,
      abortSignal: undefined,
    });

    expect(esqlQuery).toHaveBeenCalledTimes(2);
    const rareQuery = esqlQuery.mock.calls[1][0].query;
    expect(rareQuery).toContain('SORT count ASC');
  });

  it('excludes empty-string patterns from NOT MATCH clauses in the rare pass', async () => {
    // An empty pattern token string matches everything and must not be used as an exclusion.
    const headResponse = makePatternResponse([
      { pattern: 'valid tokens', count: 1000 },
      { pattern: '', count: 800 }, // empty-string pattern from CATEGORIZE
    ]);
    const esqlQuery = jest
      .fn()
      .mockResolvedValueOnce(headResponse)
      .mockResolvedValueOnce(emptyResponse);
    const esClient = { esql: { query: esqlQuery } } as unknown as ElasticsearchClient;

    await collectCandidates({
      scope: BASE_SCOPE,
      total: 100_000,
      esClient,
      abortSignal: undefined,
    });

    const rareQuery = esqlQuery.mock.calls[1][0].query;
    expect(rareQuery).toContain('NOT MATCH(message, "valid tokens"');
    expect(rareQuery).not.toContain('NOT MATCH(message, ""');
  });
});
