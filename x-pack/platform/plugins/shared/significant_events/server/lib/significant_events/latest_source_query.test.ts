/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import { inFilter, runPaginatedLatestSourceEsqlQuery } from './latest_source_query';

const emptySourceResponse = {
  columns: [{ name: '_source', type: 'object' }],
  values: [],
} as unknown as ESQLSearchResponse;

const countResponse = {
  columns: [{ name: 'total', type: 'long' }],
  values: [[0]],
} as unknown as ESQLSearchResponse;

describe('buildLatestSourceBaseQuery (via runPaginatedLatestSourceEsqlQuery)', () => {
  it('applies the `where` filter after the latest-per-group collapse, not before', async () => {
    const query = jest.fn(async (request: { query: string }) =>
      request.query.includes('STATS total') ? countResponse : emptySourceResponse
    );
    const esClient = { esql: { query } } as never;

    const where = inFilter({ where: undefined, field: 'status', values: ['promoted'] });

    await runPaginatedLatestSourceEsqlQuery({
      esClient,
      space: 'default',
      options: {},
      index: '.some-events',
      where,
      groupBy: 'discovery_slug',
    });

    const dataQuery = query.mock.calls
      .map((call) => call[0].query)
      .find((q) => !q.includes('STATS total'));
    expect(dataQuery).toBeDefined();

    // The collapse (`INLINE STATS ... BY discovery_slug`, twice) must appear before the
    // status filter, so the filter reflects the resolved latest version, not a historical one.
    const firstInlineStatsIdx = dataQuery!.indexOf('INLINE STATS');
    const lastInlineStatsIdx = dataQuery!.lastIndexOf('INLINE STATS');
    const whereStatusIdx = dataQuery!.indexOf('status');

    expect(firstInlineStatsIdx).toBeGreaterThan(-1);
    expect(whereStatusIdx).toBeGreaterThan(lastInlineStatsIdx);
  });

  it('applies the upper time bound (`to`) after the collapse, but the lower bound (`from`) before it', async () => {
    const query = jest.fn(async (request: { query: string }) =>
      request.query.includes('STATS total') ? countResponse : emptySourceResponse
    );
    const esClient = { esql: { query } } as never;

    await runPaginatedLatestSourceEsqlQuery({
      esClient,
      space: 'default',
      options: { from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z' },
      index: '.some-events',
      groupBy: 'discovery_slug',
    });

    const dataQuery = query.mock.calls
      .map((call) => call[0].query)
      .find((q) => !q.includes('STATS total'));
    expect(dataQuery).toBeDefined();

    const firstInlineStatsIdx = dataQuery!.indexOf('INLINE STATS');
    const lastInlineStatsIdx = dataQuery!.lastIndexOf('INLINE STATS');
    expect(firstInlineStatsIdx).toBeGreaterThan(-1);

    // Both bounds render as `TO_DATETIME(...)` conditions; the first occurrence is the
    // pre-collapse `from` bound, the last is the post-collapse `to` bound. Applying `to`
    // before the collapse would drop a just-written newer version (e.g. right after closing
    // an event) and let a stale, in-range sibling win the collapse instead.
    const firstToDatetimeIdx = dataQuery!.indexOf('TO_DATETIME');
    const lastToDatetimeIdx = dataQuery!.lastIndexOf('TO_DATETIME');
    expect(firstToDatetimeIdx).toBeGreaterThan(-1);
    expect(firstToDatetimeIdx).toBeLessThan(firstInlineStatsIdx);
    expect(lastToDatetimeIdx).toBeGreaterThan(lastInlineStatsIdx);
  });

  it('omits the `where` filter entirely when none is provided', async () => {
    const query = jest.fn(async (request: { query: string }) =>
      request.query.includes('STATS total') ? countResponse : emptySourceResponse
    );
    const esClient = { esql: { query } } as never;

    await runPaginatedLatestSourceEsqlQuery({
      esClient,
      space: 'default',
      options: {},
      index: '.some-events',
      groupBy: 'discovery_slug',
    });

    const dataQuery = query.mock.calls
      .map((call) => call[0].query)
      .find((q) => !q.includes('STATS total'));

    expect(dataQuery).not.toContain('status');
  });
});
