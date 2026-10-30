/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiError, createContextManager, resultEdges } from '../test_helpers';
import { buildRow } from './build_rows';
import { collectResults } from './collect_results';

const RESULTS = 'GET /api/osquery/live_queries/action-1/results/query-1';

/** One row as the budget measures it, so a budget can be stated in whole rows. */
const ROW_BYTES = Buffer.byteLength(
  JSON.stringify(buildRow(resultEdges(1)[0]._source, [])),
  'utf8'
);

const collect = (
  routes: Parameters<typeof createContextManager>[0],
  overrides: Partial<Parameters<typeof collectResults>[0]> = {}
) => {
  const contextManager = createContextManager(routes);
  const budget = { remainingBytes: 8 * 1024 * 1024, exhausted: false };
  const result = collectResults({
    contextManager,
    actionId: 'action-1',
    queryActionId: 'query-1',
    ecsKeys: [],
    rowCount: 10,
    maxRows: 100,
    budget,
    ...overrides,
  });

  return { contextManager, budget, result };
};

describe('collectResults', () => {
  describe('paging', () => {
    it('sorts by event.ingested ascending', async () => {
      const { contextManager, result } = collect({
        [RESULTS]: () => ({ data: { edges: resultEdges(1) } }),
      });
      await result;

      expect(contextManager.callKibanaApi.mock.calls[0][0].query).toMatchObject({
        sort: 'event.ingested',
        sortOrder: 'asc',
      });
    });

    it('asks for no more rows than the caller wants', async () => {
      const { contextManager, result } = collect(
        { [RESULTS]: () => ({ data: { edges: resultEdges(1) } }) },
        { rowCount: 400, maxRows: 1 }
      );
      await result;

      expect(contextManager.callKibanaApi.mock.calls[0][0].query).toMatchObject({
        page: 0,
        pageSize: 1,
      });
    });
  });

  describe('failed reads', () => {
    it('keeps the rows read before a failed page instead of dropping them', async () => {
      let call = 0;
      const { result } = collect(
        {
          [RESULTS]: () => {
            call += 1;

            return call === 1 ? { data: { edges: resultEdges(200) } } : apiError(500);
          },
        },
        { rowCount: 400, maxRows: 1000 }
      );

      const { rows, readFailed } = await result;

      expect(rows).toHaveLength(200);
      expect(readFailed).toBe(true);
    });

    it('steps the page size down to a divisor and resumes at the same offset', async () => {
      const pages: Array<{ page: unknown; pageSize: unknown }> = [];
      const { result } = collect(
        {
          [RESULTS]: ({ query }) => {
            pages.push({ page: query?.page, pageSize: query?.pageSize });

            return query?.pageSize === 200
              ? apiError(500)
              : { data: { edges: resultEdges(Number(query?.pageSize) - 1) } };
          },
        },
        { rowCount: 500, maxRows: 1000 }
      );

      const { rows, readFailed } = await result;

      expect(pages).toEqual([
        { page: 0, pageSize: 200 },
        { page: 0, pageSize: 25 },
      ]);
      expect(rows).toHaveLength(24);
      expect(readFailed).toBe(false);
    });

    it('tries every smaller page before giving up, always on a whole page index', async () => {
      let call = 0;
      const pages: Array<{ page: number; pageSize: number }> = [];
      const { result } = collect(
        {
          [RESULTS]: ({ query }) => {
            call += 1;
            pages.push({ page: Number(query?.page), pageSize: Number(query?.pageSize) });

            return call === 1 ? { data: { edges: resultEdges(200) } } : apiError(500);
          },
        },
        { rowCount: 400, maxRows: 1000 }
      );

      const { rows, readFailed } = await result;

      // Every retry re-reads offset 200 as a whole number of pages of the smaller size.
      expect(pages).toEqual([
        { page: 0, pageSize: 200 },
        { page: 1, pageSize: 200 },
        { page: 8, pageSize: 25 },
        { page: 40, pageSize: 5 },
        { page: 200, pageSize: 1 },
      ]);
      expect(rows).toHaveLength(200);
      expect(readFailed).toBe(true);
    });

    it.each([401, 403])(
      'rethrows a %s so the caller can report the lost read access',
      async (status) => {
        const { result } = collect({ [RESULTS]: () => apiError(status) });

        await expect(result).rejects.toMatchObject({ status });
      }
    );
  });

  describe('output budget', () => {
    it('returns the rows that fit and marks the budget spent', async () => {
      const budget = { remainingBytes: ROW_BYTES * 2, exhausted: false };
      const { result } = collect(
        { [RESULTS]: () => ({ data: { edges: resultEdges(10) } }) },
        { rowCount: 10, maxRows: 10, budget }
      );

      const { rows, readFailed } = await result;

      expect(rows).toHaveLength(2);
      expect(readFailed).toBe(false);
      expect(budget.exhausted).toBe(true);
    });

    it('reads nothing once the budget is spent', async () => {
      const { contextManager, result } = collect(
        { [RESULTS]: () => ({ data: { edges: resultEdges(10) } }) },
        { budget: { remainingBytes: ROW_BYTES * 10, exhausted: true } }
      );

      expect(await result).toEqual({ rows: [], readFailed: false });
      expect(contextManager.callKibanaApi).not.toHaveBeenCalled();
    });
  });
});
