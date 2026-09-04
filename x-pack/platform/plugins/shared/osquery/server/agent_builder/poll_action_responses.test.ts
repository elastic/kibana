/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pollActionResponses } from './poll_action_responses';

const responsesSearchResult = (distinctAgents: number) => ({
  hits: { total: { value: distinctAgents }, hits: [] },
  aggregations: { distinct_agents: { value: distinctAgents } },
});

/** Same shape but raw doc count deliberately disagrees with distinct agents. */
const duplicateResponsesSearchResult = (distinctAgents: number) => ({
  hits: { total: { value: distinctAgents + 2 }, hits: [] },
  aggregations: { distinct_agents: { value: distinctAgents } },
});

describe('pollActionResponses', () => {
  it('polls action responses for completion metadata and result index for SQL rows', async () => {
    const search = jest
      .fn()
      .mockResolvedValueOnce(responsesSearchResult(1))
      .mockResolvedValueOnce({
        hits: { hits: [{ _source: { osquery: { pid: 1, name: 'launchd' } } }] },
      });

    const result = await pollActionResponses({ search } as any, 'query-action-1', {
      budgetMs: 10,
      intervalMs: 1,
      spaceId: 'default',
      expectedAgentCount: 2,
      maxRows: 10,
    });

    expect(search).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        index: 'logs-osquery_manager.action.responses*',
        size: 0,
        aggs: {
          distinct_agents: { cardinality: { field: 'agent_id' } },
          error_agents: {
            filter: { exists: { field: 'error' } },
            aggs: { distinct: { cardinality: { field: 'agent_id' } } },
          },
        },
        query: expect.objectContaining({
          bool: expect.objectContaining({
            filter: expect.arrayContaining([{ term: { action_id: 'query-action-1' } }]),
          }),
        }),
      })
    );
    expect(search).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        index: 'logs-osquery_manager.result*',
        size: 10,
        query: expect.objectContaining({
          bool: expect.objectContaining({
            filter: expect.arrayContaining([{ term: { action_id: 'query-action-1' } }]),
          }),
        }),
      })
    );
    expect(result).toEqual({
      responded: 1,
      expected: 2,
      rows: [{ pid: 1, name: 'launchd' }],
      status: 'partial',
    });
  });

  it('only reports completed after every expected agent responds', async () => {
    const search = jest
      .fn()
      .mockResolvedValueOnce(responsesSearchResult(2))
      .mockResolvedValueOnce({ hits: { hits: [] } });

    const result = await pollActionResponses({ search } as any, 'query-action-1', {
      budgetMs: 10,
      intervalMs: 1,
      spaceId: 'default',
      expectedAgentCount: 2,
    });

    expect(result.status).toBe('completed');
  });

  it('reports status error when every search attempt fails', async () => {
    const search = jest.fn().mockRejectedValue(new Error('es search failed'));

    const result = await pollActionResponses({ search } as any, 'query-action-1', {
      budgetMs: 10,
      intervalMs: 1,
      spaceId: 'default',
      expectedAgentCount: 2,
    });

    expect(result.status).toBe('error');
    expect(result.error).toMatch(/es search failed/);
    expect(result.rows).toEqual([]);
  });

  it('still reports a terminal status when a later iteration succeeds after failures', async () => {
    const search = jest
      .fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce(responsesSearchResult(1))
      .mockResolvedValueOnce({ hits: { hits: [{ _source: { pid: 1 } }] } });

    const result = await pollActionResponses({ search } as any, 'query-action-1', {
      budgetMs: 50,
      intervalMs: 1,
      spaceId: 'default',
      expectedAgentCount: 2,
    });

    expect(result.status).not.toBe('error');
    expect(result.status).toBe('partial');
    expect(result.rows).toEqual([{ pid: 1 }]);
  });

  it('does not complete early when one agent produced multiple response docs', async () => {
    // Raw doc count reads 3 >= 3 here; cardinality correctly reads 2 of 3.
    const search = jest
      .fn()
      .mockResolvedValueOnce({
        hits: { total: { value: 3 }, hits: [] },
        aggregations: { distinct_agents: { value: 2 } },
      })
      .mockResolvedValueOnce({ hits: { hits: [] } })
      .mockResolvedValueOnce(duplicateResponsesSearchResult(3))
      .mockResolvedValueOnce({ hits: { hits: [] } });

    const result = await pollActionResponses({ search } as any, 'query-action-1', {
      budgetMs: 50,
      intervalMs: 1,
      spaceId: 'default',
      expectedAgentCount: 3,
    });

    // 5 raw docs / 3 distinct agents: a hits.total implementation reports 5
    // and this expectation fails — only the cardinality agg reports 3.
    expect(result.responded).toBe(3);
    expect(result.status).toBe('completed');
  });

  it('reports error status when every responding agent reported an execution error', async () => {
    // Each poll iteration issues two searches (responses, then results).
    const search = jest.fn().mockImplementation(async () => {
      const call = search.mock.calls.length;

      return call % 2 === 1
        ? {
            hits: { total: { value: 2 }, hits: [] },
            aggregations: {
              distinct_agents: { value: 2 },
              error_agents: { doc_count: 2, distinct: { value: 2 } },
            },
          }
        : { hits: { hits: [] } };
    });

    const result = await pollActionResponses({ search } as any, 'query-action-1', {
      budgetMs: 10,
      intervalMs: 1,
      spaceId: 'default',
      expectedAgentCount: 2,
    });

    expect(result.status).toBe('error');
    expect(result.errorAgents).toBe(2);
    expect(result.error).toMatch(/execution error/);
  });

  it('does not report a hard error while other dispatched agents are still pending', async () => {
    // One agent errored, a second was dispatched but never reported by budget
    // expiry. That is a retryable partial, not "the query failed".
    const search = jest.fn().mockImplementation(async () => {
      const call = search.mock.calls.length;

      return call % 2 === 1
        ? {
            hits: { total: { value: 1 }, hits: [] },
            aggregations: {
              distinct_agents: { value: 1 },
              error_agents: { doc_count: 1, distinct: { value: 1 } },
            },
          }
        : { hits: { hits: [] } };
    });

    const result = await pollActionResponses({ search } as any, 'query-action-1', {
      budgetMs: 10,
      intervalMs: 1,
      spaceId: 'default',
      expectedAgentCount: 2,
    });

    expect(result.status).toBe('partial');
    expect(result.errorAgents).toBe(1);
  });
});
