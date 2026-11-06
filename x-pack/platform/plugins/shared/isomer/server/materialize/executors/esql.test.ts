/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { SearchMethodsService } from '@kbn/data-plugin/common/search/search_methods';
import type { Filter } from '@kbn/es-query';
import type { ISearchGeneric } from '@kbn/search-types';
import { DataRequestTimeoutError, capRows, executeEsql } from './esql';

const timeRange = { from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z' };
const phraseFilter: Filter = {
  meta: { alias: null, disabled: false, negate: false },
  query: { match_phrase: { 'host.name': 'web-01' } },
};

const esqlResponse = (rowCount: number) => ({
  columns: [
    { name: 'host.name', type: 'keyword' },
    { name: 'count', type: 'long' },
  ],
  values: Array.from({ length: rowCount }, (_, index) => [`web-${index}`, index]),
});

/** Kibana's own ES|QL search method over a fake transport, so the request it builds is real. */
const setup = (rowCount: number) => {
  const transport = jest.fn<ReturnType<ISearchGeneric>, Parameters<ISearchGeneric>>(() =>
    of({ isRunning: false, rawResponse: esqlResponse(rowCount) })
  );
  const search = new SearchMethodsService(transport as unknown as ISearchGeneric, {
    getEsQueryConfig: async () => ({
      allowLeadingWildcards: true,
      queryStringOptions: {},
      ignoreFilterIfFieldNotInIndex: false,
      dateFormatTZ: 'America/New_York',
    }),
  });
  const getRequestParams = () => transport.mock.calls[0][0].params;
  return { search, transport, getRequestParams };
};

const deps = (search: SearchMethodsService, abortSignal = new AbortController().signal) => ({
  search,
  abortSignal,
  maxRows: 3,
  timeoutMs: 30_000,
});

describe('executeEsql', () => {
  it('runs the query with the context, the way Lens does, one row past the cap', async () => {
    const { search, getRequestParams } = setup(2);

    await executeEsql(
      {
        kind: 'esql',
        query: 'FROM logs | WHERE status == ?status | STATS count = COUNT(*) BY host.name',
        params: { status: 500 },
        timeField: '@timestamp',
      },
      {
        timeRange,
        filters: [phraseFilter],
        query: { language: 'kuery', query: 'service.name: checkout' },
        timeZone: 'Europe/Paris',
        locale: 'fr-FR',
      },
      0,
      deps(search)
    );

    const params = getRequestParams();
    expect(params.query).toBe(
      'FROM logs | WHERE status == ?status | STATS count = COUNT(*) BY host.name\n| LIMIT 4'
    );
    expect(params.params).toEqual(expect.arrayContaining([{ status: 500 }]));
    expect(params.time_zone).toBe('Europe/Paris');
    expect(params.locale).toBe('fr-FR');
    expect(params.dropNullColumns).toBe(true);
    const filterJson = JSON.stringify(params.filter);
    expect(filterJson).toContain('web-01');
    expect(filterJson).toContain('checkout');
    expect(params.filter.bool.filter).toContainEqual({
      range: {
        '@timestamp': {
          format: 'strict_date_optional_time',
          gte: timeRange.from,
          lte: timeRange.to,
        },
      },
    });
  });

  it('binds the time range as ?_tstart and ?_tend without a time field', async () => {
    const { search, getRequestParams } = setup(1);

    await executeEsql(
      { kind: 'esql', query: 'FROM logs | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend' },
      { timeRange },
      0,
      deps(search)
    );

    expect(getRequestParams().filter).toBeUndefined();
    expect(getRequestParams().params).toEqual([
      { _tstart: timeRange.from },
      { _tend: timeRange.to },
    ]);
  });

  it('returns the table with no losses when it fits under the cap', async () => {
    const { search } = setup(3);
    const { table, losses } = await executeEsql(
      { kind: 'esql', query: 'FROM logs' },
      {},
      0,
      deps(search)
    );
    expect(table.type).toBe('datatable');
    expect(table.columns.map(({ id }) => id)).toEqual(['host.name', 'count']);
    expect(table.rows).toHaveLength(3);
    expect(losses).toEqual([]);
  });

  it('caps the table and records the loss when the query returns more', async () => {
    const { search } = setup(4);
    const { table, losses } = await executeEsql(
      { kind: 'esql', query: 'FROM logs' },
      {},
      2,
      deps(search)
    );
    expect(table.rows).toHaveLength(3);
    expect(losses).toEqual([
      {
        path: 'data.rows',
        kind: 'dropped',
        note: 'Kept the first 3 rows of data request 2; its query returned more.',
      },
    ]);
  });

  it("uses a request's own lower cap, and never a higher one", async () => {
    const lower = setup(2);
    await executeEsql({ kind: 'esql', query: 'FROM logs', maxRows: 1 }, {}, 0, deps(lower.search));
    expect(lower.getRequestParams().query).toBe('FROM logs\n| LIMIT 2');

    const higher = setup(2);
    await executeEsql(
      { kind: 'esql', query: 'FROM logs', maxRows: 50 },
      {},
      0,
      deps(higher.search)
    );
    expect(higher.getRequestParams().query).toBe('FROM logs\n| LIMIT 4');
  });

  it('raises a timeout error when the query runs past its timeout', async () => {
    const search = {
      esql: jest.fn(
        (_params, options) =>
          new Promise<never>((_resolve, reject) => {
            options?.abortSignal?.addEventListener('abort', () => reject(new Error('aborted')));
          })
      ),
    };
    await expect(
      executeEsql({ kind: 'esql', query: 'FROM logs' }, {}, 0, {
        search,
        abortSignal: new AbortController().signal,
        maxRows: 3,
        timeoutMs: 10,
      })
    ).rejects.toThrow(new DataRequestTimeoutError(10));
    expect(new DataRequestTimeoutError(30_000).message).toBe(
      'The query did not finish within 30 seconds.'
    );
  });

  it("passes the caller's abort through as is", async () => {
    const controller = new AbortController();
    const search = {
      esql: jest.fn(
        (_params, options) =>
          new Promise<never>((_resolve, reject) => {
            options?.abortSignal?.addEventListener('abort', () => reject(new Error('aborted')));
          })
      ),
    };
    const run = executeEsql({ kind: 'esql', query: 'FROM logs' }, {}, 0, {
      search,
      abortSignal: controller.signal,
      maxRows: 3,
      timeoutMs: 30_000,
    });
    controller.abort();
    await expect(run).rejects.toThrow('aborted');
  });
});

describe('capRows', () => {
  it('keeps a table at or under the cap as is', () => {
    const table = { type: 'datatable' as const, columns: [], rows: [{}, {}] };
    expect(capRows(table, 2, 0)).toEqual({ table, losses: [] });
  });
});
