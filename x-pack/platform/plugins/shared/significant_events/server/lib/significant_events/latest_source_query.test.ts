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
