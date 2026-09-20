/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import { buildCategorizeQuery, buildCountQuery, type EsqlSearchScope } from './run_queries';

const BASE_SCOPE: EsqlSearchScope = {
  target: 'logs-*',
  startIso: '2024-01-01T00:00:00.000Z',
  endIso: '2024-01-02T00:00:00.000Z',
};

describe('buildCountQuery', () => {
  it('includes the target and time-range filter', () => {
    const query = buildCountQuery(BASE_SCOPE);
    expect(query).toContain('FROM logs-*');
    expect(query).toContain('WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend');
    expect(query).toContain('STATS total = COUNT(*)');
  });

  it('appends a KQL filter when provided', () => {
    const query = buildCountQuery({ ...BASE_SCOPE, kqlFilter: 'service.name: "checkout"' });
    expect(query).toContain('KQL("service.name: \\"checkout\\""');
  });

  it('omits a KQL clause when kqlFilter is absent', () => {
    const query = buildCountQuery(BASE_SCOPE);
    expect(query).not.toContain('KQL');
  });
});

describe('buildCategorizeQuery', () => {
  const baseOptions = {
    scope: BASE_SCOPE,
    exclusionPatterns: [],
    samplingProbability: 1,
    noiseThreshold: 0,
    sortOrder: 'DESC' as const,
  };

  it('includes the required STATS columns', () => {
    const query = buildCategorizeQuery(baseOptions);
    expect(query).toContain('STATS count = COUNT(*)');
    expect(query).toContain('first_seen = MIN(@timestamp)');
    expect(query).toContain('last_seen = MAX(@timestamp)');
    expect(query).toContain('LATEST(message)');
    expect(query).toContain('BY pattern = CATEGORIZE(message');
  });

  it('omits SAMPLE when probability is 1', () => {
    const query = buildCategorizeQuery({ ...baseOptions, samplingProbability: 1 });
    expect(query).not.toContain('SAMPLE');
  });

  it('emits SAMPLE when probability is less than 1', () => {
    const query = buildCategorizeQuery({ ...baseOptions, samplingProbability: 0.5 });
    expect(query).toContain('SAMPLE');
  });

  it('omits the noise threshold filter when noiseThreshold is 0', () => {
    const query = buildCategorizeQuery({ ...baseOptions, noiseThreshold: 0 });
    // The WHERE for the time range is expected; no extra WHERE for count threshold.
    const countThresholdIndex = query.indexOf('WHERE count >');
    expect(countThresholdIndex).toBe(-1);
  });

  it('adds the noise threshold filter after STATS when noiseThreshold is positive', () => {
    const query = buildCategorizeQuery({ ...baseOptions, noiseThreshold: 42 });
    expect(query).toContain('WHERE count > ');
    // Threshold sits after the STATS pipe, not before the SAMPLE pipe.
    expect(query.indexOf('STATS')).toBeLessThan(query.indexOf('WHERE count >'));
  });

  it('includes SORT count ASC for the rare pass sort order', () => {
    const query = buildCategorizeQuery({ ...baseOptions, sortOrder: 'ASC' });
    expect(query).toContain('SORT count ASC');
  });

  it('includes SORT count DESC for the head pass sort order', () => {
    const query = buildCategorizeQuery({ ...baseOptions, sortOrder: 'DESC' });
    expect(query).toContain('SORT count DESC');
  });

  it('includes an explicit row limit', () => {
    const query = buildCategorizeQuery(baseOptions);
    expect(query).toContain('LIMIT 1000');
  });

  it('adds NOT MATCH exclusions before SAMPLE and STATS', () => {
    const query = buildCategorizeQuery({
      ...baseOptions,
      exclusionPatterns: ['timeout error', 'connection refused'],
      samplingProbability: 0.5,
    });
    expect(query).toContain('NOT MATCH(message, "timeout error"');
    expect(query).toContain('NOT MATCH(message, "connection refused"');
    // Exclusions must precede SAMPLE and STATS for correctness.
    const notMatchIndex = query.indexOf('NOT MATCH');
    const sampleIndex = query.indexOf('SAMPLE');
    const statsIndex = query.indexOf('STATS');
    expect(notMatchIndex).toBeLessThan(sampleIndex);
    expect(notMatchIndex).toBeLessThan(statsIndex);
  });

  it('skips empty-string exclusion patterns', () => {
    const query = buildCategorizeQuery({
      ...baseOptions,
      exclusionPatterns: ['valid tokens', '', 'another valid'],
    });
    // Empty string matches everything; it must not appear in a NOT MATCH clause.
    const notMatchClauses = query.match(/NOT MATCH/g) ?? [];
    expect(notMatchClauses).toHaveLength(2);
    expect(query).not.toContain('NOT MATCH(message, ""');
  });

  it('includes the KQL filter from the scope', () => {
    const query = buildCategorizeQuery({
      ...baseOptions,
      scope: { ...BASE_SCOPE, kqlFilter: 'service.name: "checkout"' },
    });
    expect(query).toContain('KQL("service.name: \\"checkout\\""');
  });
});

// ---------------------------------------------------------------------------
// runCountProbe — partial-results path
// ---------------------------------------------------------------------------

describe('runCountProbe', () => {
  it('returns incomplete when the probe response is partial', async () => {
    const { runCountProbe } = await import('./run_queries');
    const partialResponse: ESQLSearchResponse & { is_partial: boolean } = {
      columns: [{ name: 'total', type: 'long' }],
      values: [[500]],
      is_partial: true,
    };
    const esClient = {
      esql: { query: jest.fn().mockResolvedValue(partialResponse) },
    } as any;

    const result = await runCountProbe({ scope: BASE_SCOPE, esClient, abortSignal: undefined });
    expect(result).toEqual({ status: 'incomplete' });
  });

  it('returns counted with the total when the probe succeeds', async () => {
    const { runCountProbe } = await import('./run_queries');
    const successResponse: ESQLSearchResponse = {
      columns: [{ name: 'total', type: 'long' }],
      values: [[12345]],
    };
    const esClient = {
      esql: { query: jest.fn().mockResolvedValue(successResponse) },
    } as any;

    const result = await runCountProbe({ scope: BASE_SCOPE, esClient, abortSignal: undefined });
    expect(result).toEqual({ status: 'counted', total: 12345 });
  });
});
