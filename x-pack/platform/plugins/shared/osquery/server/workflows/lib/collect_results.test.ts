/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RESULTS_MAX_READS_PER_POLL,
  RESULTS_MAX_WINDOW,
  RESULTS_PAGE_SIZE,
} from '../../../common/workflows/contract/budget';
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

  describe('page sizes after the first page', () => {
    const pageRequests = async (maxRows: number) => {
      const pages: Array<{ page: unknown; pageSize: unknown }> = [];
      const { result } = collect(
        {
          [RESULTS]: ({ query }) => {
            pages.push({ page: query?.page, pageSize: query?.pageSize });

            return { data: { edges: resultEdges(Number(query?.pageSize)) } };
          },
        },
        { rowCount: 1000, maxRows }
      );
      const { rows } = await result;

      return { pages, rows };
    };

    it('does not read a whole second page to keep one row', async () => {
      const { pages, rows } = await pageRequests(201);

      expect(pages).toEqual([
        { page: 0, pageSize: 200 },
        { page: 200, pageSize: 1 },
      ]);
      expect(rows).toHaveLength(201);
    });

    it('steps down 200, 25, 5, 1 so the page index stays whole', async () => {
      const { pages, rows } = await pageRequests(431);

      expect(pages).toEqual([
        { page: 0, pageSize: 200 },
        { page: 1, pageSize: 200 },
        { page: 16, pageSize: 25 },
        { page: 85, pageSize: 5 },
        { page: 430, pageSize: 1 },
      ]);
      expect(rows).toHaveLength(431);
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

    it('returns to the full page size once the offset is a whole page again after one failure', async () => {
      const pages: Array<{ page: number; pageSize: number }> = [];
      const { result } = collect(
        {
          [RESULTS]: ({ query }) => {
            const pageSize = Number(query?.pageSize);
            pages.push({ page: Number(query?.page), pageSize });

            // Only the second 200-row page fails, as one transient error would.
            return pages.length === 2 ? apiError(503) : { data: { edges: resultEdges(pageSize) } };
          },
        },
        { rowCount: 600, maxRows: 600 }
      );

      const { rows, readFailed } = await result;

      // The failed page is re-read at offset 200 in 25-row pages up to offset 400, where a whole
      // 200-row page starts again.
      expect(pages).toEqual([
        { page: 0, pageSize: 200 },
        { page: 1, pageSize: 200 },
        ...Array.from({ length: 8 }, (_, index) => ({ page: 8 + index, pageSize: 25 })),
        { page: 2, pageSize: 200 },
      ]);
      expect(rows).toHaveLength(600);
      expect(readFailed).toBe(false);
    });

    it('reads all 10000 rows within the read cap after one transient failure on the first page', async () => {
      let call = 0;
      const { contextManager, result } = collect(
        {
          [RESULTS]: ({ query }) => {
            call += 1;

            return call === 1
              ? apiError(503)
              : { data: { edges: resultEdges(Number(query?.pageSize)) } };
          },
        },
        { rowCount: 10000, maxRows: 10000 }
      );

      const { rows, readFailed } = await result;

      expect(rows).toHaveLength(10000);
      expect(readFailed).toBe(false);
      // 8 small pages up to the first whole 200-row page, then 200-row pages for the rest.
      expect(contextManager.callKibanaApi.mock.calls.length).toBeLessThan(100);
    });

    it('stops after RESULTS_MAX_READS_PER_POLL reads and reports the rows read as a failed read', async () => {
      const { contextManager, result } = collect(
        {
          // Only single-row pages work, so each 200 rows take 3 failed reads and 200 successful
          // ones, and 10000 rows would take thousands of reads.
          [RESULTS]: ({ query }) =>
            Number(query?.pageSize) === 1 ? { data: { edges: resultEdges(1) } } : apiError(500),
        },
        { rowCount: 10000, maxRows: 10000 }
      );

      const { rows, readFailed } = await result;

      expect(contextManager.callKibanaApi).toHaveBeenCalledTimes(RESULTS_MAX_READS_PER_POLL);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.length).toBeLessThan(RESULTS_MAX_READS_PER_POLL);
      expect(readFailed).toBe(true);
    });

    it('never asks for a page past the 10k window, even when rows come back without a source', async () => {
      const pageNumbers: number[] = [];
      const { result } = collect(
        {
          [RESULTS]: ({ query }) => {
            pageNumbers.push(Number(query?.page));

            // Full pages of documents without `_source`: they are skipped, so `rows` stays empty
            // while the offset advances, and only the window guard stops the loop.
            return { data: { edges: Array.from({ length: 200 }, () => ({})) } };
          },
        },
        { rowCount: 10000, maxRows: 10000 }
      );

      const { rows, readFailed } = await result;

      expect(rows).toEqual([]);
      expect(readFailed).toBe(false);
      expect(pageNumbers).toHaveLength(RESULTS_MAX_WINDOW / RESULTS_PAGE_SIZE);
      expect(Math.max(...pageNumbers)).toBe(RESULTS_MAX_WINDOW / RESULTS_PAGE_SIZE - 1);
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
