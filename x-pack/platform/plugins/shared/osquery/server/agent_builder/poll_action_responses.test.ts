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
        // Completion is measured by distinct responding agents, not document
        // count: the action-responses transform can emit multiple docs per
        // agent (keyed on @timestamp + action_id + agent_id).
        aggs: { distinct_agents: { cardinality: { field: 'agent_id' } } },
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

  it('does not complete early when one agent produced multiple response docs', async () => {
    // Regression: raw doc count would read this as 3 >= 3 (completed); the
    // cardinality agg correctly reads 2 of 3 distinct agents.
    const search = jest
      .fn()
      .mockResolvedValueOnce({
        hits: { total: { value: 3 }, hits: [] },
        aggregations: { distinct_agents: { value: 2 } },
      })
      .mockResolvedValueOnce({ hits: { hits: [] } })
      .mockResolvedValueOnce(responsesSearchResult(3))
      .mockResolvedValueOnce({ hits: { hits: [] } });

    const result = await pollActionResponses({ search } as any, 'query-action-1', {
      budgetMs: 50,
      intervalMs: 1,
      spaceId: 'default',
      expectedAgentCount: 3,
    });

    expect(result.responded).toBe(3);
    expect(result.status).toBe('completed');
  });
});
