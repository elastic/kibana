/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiError, createContextManager, resultEdges } from '../test_helpers';
import { collectResults } from './collect_results';

const RESULTS = 'GET /api/osquery/live_queries/action-1/results/query-1';

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

  it('halves the page size after a failed read and resumes at the same offset', async () => {
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
      { page: 0, pageSize: 100 },
    ]);
    expect(rows).toHaveLength(99);
    expect(readFailed).toBe(false);
  });

  it('rethrows a 403 so the caller can report the lost read access', async () => {
    const { result } = collect({ [RESULTS]: () => apiError(403) });

    await expect(result).rejects.toMatchObject({ status: 403 });
  });
});
