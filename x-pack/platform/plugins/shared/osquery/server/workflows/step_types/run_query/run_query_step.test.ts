/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExecutionError } from '@kbn/workflows/server';
import { OSQUERY_MAX_AGENTS_HEADER } from '../../../../common/constants';
import { TARGET_AGENT_LIMIT } from '../../../../common/workflows/contract/budget';
import { runQueryStepDefinition } from './run_query_step';
import { apiError, createContextManager, createLogger, resultEdges } from '../../test_helpers';

const FIND = 'GET /api/osquery/saved_queries';
const POST = 'POST /api/osquery/live_queries';
const DETAILS = 'GET /api/osquery/live_queries/action-1';
const RESULTS = 'GET /api/osquery/live_queries/action-1/results/query-action-1';

const SAVED_QUERY = {
  id: 'procs',
  query: 'SELECT pid, name FROM processes',
  ecs_mapping: { 'process.name': { field: 'name' } },
};

const counters = (overrides: Record<string, number> = {}) => ({
  action_id: 'query-action-1',
  docs: 0,
  pending: 0,
  responded: 1,
  successful: 1,
  failed: 0,
  ...overrides,
});

const dispatchBody = {
  data: { action_id: 'action-1', agents: ['agent-1'], queries: [{ action_id: 'query-action-1' }] },
};

type Routes = Parameters<typeof createContextManager>[0];

const start = (routes: Routes, input: Record<string, unknown> = {}) => {
  const contextManager = createContextManager({
    [FIND]: () => ({ data: [SAVED_QUERY] }),
    [POST]: () => dispatchBody,
    ...routes,
  });
  const result = runQueryStepDefinition.start!({
    input: { saved_query: 'procs', agent_ids: ['agent-1'], ...input },
    contextManager,
    logger: createLogger(),
  } as never);

  return { contextManager, result: Promise.resolve(result) };
};

const baseState = {
  action_id: 'action-1',
  deadline: new Date(Date.now() + 60_000).toISOString(),
  max_rows: 1000,
  agents_total: 1,
  queries: [{ query_id: 'procs', action_id: 'query-action-1', ecs_keys: ['process.name'] }],
};

/** The results route over `indexed` searchable documents: the requested page and the `total`. */
const resultsRoute = (indexed: number) =>
  jest.fn(({ query }: { query?: Record<string, unknown> }) => {
    const pageSize = Number(query?.pageSize ?? 200);
    const from = Number(query?.page ?? 0) * pageSize;

    return {
      data: { edges: resultEdges(Math.max(0, Math.min(pageSize, indexed - from))), total: indexed },
    };
  });

const pageSizes = (results: ReturnType<typeof resultsRoute>) =>
  results.mock.calls.map(([call]) => call.query?.pageSize);

const poll = (routes: Routes, state: Record<string, unknown> = {}) => {
  const contextManager = createContextManager(routes);

  return {
    contextManager,
    result: Promise.resolve(
      runQueryStepDefinition.poll!({
        state: { ...baseState, ...state },
        contextManager,
        logger: createLogger(),
        attempt: 1,
      } as never)
    ),
  };
};

describe('osquery.runQuery step', () => {
  describe('start', () => {
    it('sends exactly one POST with the saved query SQL, mapping and id, and no alert_ids', async () => {
      const { contextManager, result } = start({});

      const { state } = (await result) as { state: Record<string, unknown> };

      const posts = contextManager.callKibanaApi.mock.calls.filter(
        ([call]) => call.method === 'POST'
      );
      expect(posts).toHaveLength(1);
      expect(posts[0][0]).toMatchObject({
        path: '/api/osquery/live_queries',
        headers: { [OSQUERY_MAX_AGENTS_HEADER]: String(TARGET_AGENT_LIMIT) },
        body: {
          query: SAVED_QUERY.query,
          ecs_mapping: SAVED_QUERY.ecs_mapping,
          saved_query_id: 'procs',
          agent_ids: ['agent-1'],
        },
      });
      expect(Object.keys((posts[0][0] as { body: object }).body)).not.toEqual(
        expect.arrayContaining(['alert_ids', 'case_ids', 'event_ids', 'metadata', 'queries'])
      );
      expect(state).toMatchObject({
        action_id: 'action-1',
        agents_total: 1,
        max_rows: 1000,
        queries: [{ action_id: 'query-action-1', ecs_keys: ['process.name'] }],
      });
    });

    it('sets the deadline from wait_timeout', async () => {
      const before = Date.now();
      const { result } = start({}, { wait_timeout: '10m' });

      const { state } = (await result) as { state: { deadline: string } };
      const waited = new Date(state.deadline).getTime() - before;

      expect(waited).toBeGreaterThan(9 * 60 * 1000);
      expect(waited).toBeLessThanOrEqual(10 * 60 * 1000 + 1000);
    });

    it('rejects a wait_timeout above 30m before any call', async () => {
      const { contextManager, result } = start({}, { wait_timeout: '10h' });

      await expect(result).rejects.toMatchObject({ details: { code: 'INVALID_INPUT' } });
      expect(contextManager.callKibanaApi).not.toHaveBeenCalled();
    });

    it('dispatches the saved query id alone when the caller cannot read saved queries', async () => {
      const { contextManager, result } = start({
        [FIND]: () => apiError(403, 'Forbidden'),
        [POST]: () => ({
          data: {
            action_id: 'action-1',
            agents: ['agent-1'],
            queries: [
              {
                action_id: 'query-action-1',
                ecs_mapping: { 'process.name': { field: 'name' } },
              },
            ],
          },
        }),
      });

      const { state } = (await result) as {
        state: { queries: Array<{ ecs_keys: string[] }> };
      };
      const post = contextManager.callKibanaApi.mock.calls.find(
        ([call]) => call.method === 'POST'
      )![0] as {
        body: Record<string, unknown>;
      };

      expect(post.body).toEqual({ saved_query_id: 'procs', agent_ids: ['agent-1'] });
      expect(state.queries[0].ecs_keys).toEqual(['process.name']);
    });

    it('sends policy targeting as agent_policy_ids and counts the agents first', async () => {
      const { contextManager, result } = start(
        { 'GET /internal/osquery/fleet_wrapper/agents': () => ({ total: 3 }) },
        { agent_ids: undefined, agent_policy_ids: ['pol-1'] }
      );

      await result;

      const post = contextManager.callKibanaApi.mock.calls.find(
        ([c]) => c.method === 'POST'
      )![0] as {
        body: Record<string, unknown>;
      };
      expect(post.body.agent_policy_ids).toEqual(['pol-1']);
      expect(post.body).not.toHaveProperty('agent_ids');
    });

    it.each([
      ['the pre-rename saved_query_id key', { saved_query: undefined, saved_query_id: 'procs' }],
      ['ad-hoc SQL', { query: 'select * from users' }],
      ['alert_ids', { alert_ids: ['alert-1'] }],
      ['no target', { agent_ids: undefined }],
    ])('rejects %s with INVALID_INPUT before any call', async (_name, input) => {
      const { contextManager, result } = start({}, input);

      await expect(result).rejects.toMatchObject({ details: { code: 'INVALID_INPUT' } });
      expect(contextManager.callKibanaApi).not.toHaveBeenCalled();
    });

    it('sends the Fleet platform values that linux expands to', async () => {
      const { contextManager, result } = start(
        {
          'GET /internal/osquery/fleet_wrapper/agents': () => ({
            groups: {
              platforms: [
                { id: 'ubuntu', size: 1 },
                { id: 'windows', size: 2 },
              ],
            },
          }),
        },
        { agent_ids: undefined, agent_platforms: ['linux'] }
      );

      await result;

      const post = contextManager.callKibanaApi.mock.calls.find(
        ([c]) => c.method === 'POST'
      )![0] as {
        body: Record<string, unknown>;
      };
      expect(post.body.agent_platforms).toEqual(['ubuntu']);
    });

    it('does not dispatch when a saved query is not found', async () => {
      const { contextManager, result } = start({ [FIND]: () => ({ data: [] }) });

      await expect(result).rejects.toMatchObject({ details: { code: 'SAVED_QUERY_NOT_FOUND' } });
      expect(contextManager.callKibanaApi.mock.calls.some(([c]) => c.method === 'POST')).toBe(
        false
      );
    });

    it('maps the route agent ceiling to TARGET_LIMIT_EXCEEDED', async () => {
      const { result } = start({
        [POST]: () =>
          apiError(
            400,
            'The selection matches 1001 agents, above the limit of 1000. Narrow it down.'
          ),
      });

      await expect(result).rejects.toMatchObject({ details: { code: 'TARGET_LIMIT_EXCEEDED' } });
    });

    it('maps the route 400 "No agents found" to AGENTS_NOT_IN_SPACE naming both causes', async () => {
      const { result } = start({ [POST]: () => apiError(400, 'No agents found for selection') });

      const error = (await result.catch((e) => e)) as ExecutionError;

      expect(error.details).toEqual({ code: 'AGENTS_NOT_IN_SPACE' });
      expect(error.message).toMatch(/not in this space/);
      expect(error.message).toMatch(/online/);
    });

    it('maps a 403 on the POST to MISSING_PRIVILEGE', async () => {
      const { result } = start({ [POST]: () => apiError(403, 'forbidden') });

      await expect(result).rejects.toMatchObject({ details: { code: 'MISSING_PRIVILEGE' } });
    });

    it.each([
      ['a 5xx', apiError(503)],
      ['a network error', new Error('socket hang up')],
    ])('returns DISPATCH_UNCONFIRMED after %s and does not retry', async (_name, failure) => {
      const { contextManager, result } = start({ [POST]: () => failure });

      const output = (await result) as { output: Record<string, unknown> };

      expect(output.output).toMatchObject({ status: 'failed', error_code: 'DISPATCH_UNCONFIRMED' });
      expect(
        contextManager.callKibanaApi.mock.calls.filter(([c]) => c.method === 'POST')
      ).toHaveLength(1);
    });

    it('reports the preflight agent count with DISPATCH_UNCONFIRMED for policy targets', async () => {
      const { result } = start(
        {
          'GET /internal/osquery/fleet_wrapper/agents': () => ({ total: 3 }),
          [POST]: () => apiError(503),
        },
        { agent_ids: undefined, agent_policy_ids: ['pol-1'] }
      );

      const output = (await result) as { output: Record<string, unknown> };

      expect(output.output).toMatchObject({
        error_code: 'DISPATCH_UNCONFIRMED',
        agents: { total: 3, responded: 0, pending: 3, failed: 0 },
      });
    });
  });

  describe('poll', () => {
    it('keeps polling while agents are pending', async () => {
      const { result } = poll({
        [DETAILS]: () => ({
          data: { queries: [counters({ pending: 1, responded: 0, successful: 0 })] },
        }),
      });

      expect(await result).toEqual({ state: expect.objectContaining({ action_id: 'action-1' }) });
    });

    it('returns success with rows tagged by agent and only the ecs_mapping keys', async () => {
      const { result } = poll({
        [DETAILS]: () => ({ data: { queries: [counters({ docs: 2 })] } }),
        [RESULTS]: resultsRoute(2),
      });

      const { output } = (await result) as { output: Record<string, any> };

      expect(output).toMatchObject({
        status: 'success',
        action_id: 'action-1',
        agents: { total: 1, responded: 1, pending: 0, failed: 0 },
        row_count: 2,
        truncated: false,
      });
      expect(output.rows).toHaveLength(2);
      expect(output.rows[0]).toEqual({
        agent: { id: 'agent-1', name: 'host-agent-1' },
        '@timestamp': '2026-10-19T10:00:00.000Z',
        columns: { pid: '0', name: 'bash' },
        ecs: { 'process.name': 'bash' },
      });
    });

    it('only counts rows while some are not searchable, and keeps no rows in state', async () => {
      const results = resultsRoute(200);
      const { result } = poll({
        [DETAILS]: () => ({ data: { queries: [counters({ docs: 400 })] } }),
        [RESULTS]: results,
      });

      expect(await result).toEqual({ state: { ...baseState, deadline: expect.any(String) } });
      expect(pageSizes(results)).toEqual([1]);
    });

    it('reads every row once in ingest order when all of them are searchable', async () => {
      const results = resultsRoute(400);
      const { result } = poll({
        [DETAILS]: () => ({ data: { queries: [counters({ docs: 400 })] } }),
        [RESULTS]: results,
      });

      const { output } = (await result) as { output: { rows: unknown[]; truncated: boolean } };

      expect(output.rows).toHaveLength(400);
      expect(output.truncated).toBe(false);
      expect(pageSizes(results)).toEqual([1, 200, 200]);
      expect(results.mock.calls[1][0].query).toMatchObject({
        sort: 'event.ingested',
        sortOrder: 'asc',
      });
    });

    it('waits for rows that are not searchable yet while counters say done', async () => {
      const { result } = poll({
        [DETAILS]: () => ({ data: { queries: [counters({ docs: 20 })] } }),
        [RESULTS]: resultsRoute(0),
      });

      expect(await result).toEqual({ state: expect.any(Object) });
    });

    it('keeps polling when the count read fails', async () => {
      const { result } = poll({
        [DETAILS]: () => ({ data: { queries: [counters({ docs: 20 })] } }),
        [RESULTS]: () => apiError(502),
      });

      expect(await result).toEqual({ state: expect.any(Object) });
    });

    it('skips the count once the deadline passed and returns the rows that exist', async () => {
      const results = resultsRoute(5);
      const { result } = poll(
        {
          [DETAILS]: () => ({ data: { queries: [counters({ docs: 20 })] } }),
          [RESULTS]: results,
        },
        { deadline: new Date(Date.now() - 1000).toISOString() }
      );

      const { output } = (await result) as { output: { rows: unknown[]; truncated: boolean } };

      expect(output.rows).toHaveLength(5);
      expect(output.truncated).toBe(true);
      expect(pageSizes(results)).toEqual([200]);
    });

    it('finishes without rows once the deadline passed, with truncated true', async () => {
      const { result } = poll(
        {
          [DETAILS]: () => ({ data: { queries: [counters({ docs: 20 })] } }),
          [RESULTS]: () => ({ data: { edges: [] } }),
        },
        { deadline: new Date(Date.now() - 1000).toISOString() }
      );

      const { output } = (await result) as { output: Record<string, unknown> };

      // Every agent answered, so the status is `success`; the rows that never became searchable
      // before the deadline show up as `truncated`.
      expect(output).toMatchObject({ status: 'success', rows: [], row_count: 20, truncated: true });
    });

    it('truncates at max_rows and reports the total row_count', async () => {
      const { result } = poll(
        {
          [DETAILS]: () => ({ data: { queries: [counters({ docs: 25000 })] } }),
          [RESULTS]: resultsRoute(25000),
        },
        { max_rows: 300 }
      );

      const { output } = (await result) as {
        output: { rows: unknown[]; row_count: number; truncated: boolean };
      };

      expect(output.rows).toHaveLength(300);
      expect(output.row_count).toBe(25000);
      expect(output.truncated).toBe(true);
    });

    it('never asks for rows beyond the 10k window', async () => {
      const results = resultsRoute(50000);
      const { result } = poll(
        {
          [DETAILS]: () => ({ data: { queries: [counters({ docs: 50000 })] } }),
          [RESULTS]: results,
        },
        { max_rows: 10000 }
      );

      await result;

      expect(pageSizes(results).filter((size) => size === 200)).toHaveLength(50);
    });

    it('returns timed_out when nobody answered by the deadline', async () => {
      const { result } = poll(
        {
          [DETAILS]: () => ({
            data: { queries: [counters({ pending: 1, responded: 0, successful: 0 })] },
          }),
        },
        { deadline: new Date(Date.now() - 1000).toISOString() }
      );

      const { output } = (await result) as { output: Record<string, any> };

      expect(output).toMatchObject({ status: 'timed_out', agents: { pending: 1, responded: 0 } });
    });

    it('returns failed when every agent failed', async () => {
      const { result } = poll({
        [DETAILS]: () => ({ data: { queries: [counters({ failed: 1, successful: 0 })] } }),
      });

      const { output } = (await result) as { output: Record<string, unknown> };

      expect(output).toMatchObject({ status: 'failed', rows: [] });
    });

    it('returns partial when only some agents succeeded', async () => {
      const { result } = poll(
        {
          [DETAILS]: () => ({
            data: { queries: [counters({ pending: 1, responded: 1, successful: 1 })] },
          }),
          [RESULTS]: () => ({ data: { edges: [] } }),
        },
        { deadline: new Date(Date.now() - 1000).toISOString(), agents_total: 2 }
      );

      const { output } = (await result) as { output: Record<string, unknown> };

      expect(output).toMatchObject({ status: 'partial' });
    });

    it.each([401, 403])(
      'returns STATUS_UNREADABLE_FORBIDDEN on a %s and never throws',
      async (status) => {
        const { result } = poll({ [DETAILS]: () => apiError(status) });

        const { output } = (await result) as { output: Record<string, unknown> };

        expect(output).toMatchObject({
          status: 'failed',
          error_code: 'STATUS_UNREADABLE_FORBIDDEN',
          action_id: 'action-1',
        });
      }
    );

    it('returns ACTION_NOT_VISIBLE on a 404', async () => {
      const { result } = poll({ [DETAILS]: () => apiError(404) });

      const { output } = (await result) as { output: Record<string, unknown> };

      expect(output).toMatchObject({ status: 'failed', error_code: 'ACTION_NOT_VISIBLE' });
    });

    it('keeps polling through a transient 5xx and does not throw', async () => {
      const { result } = poll({ [DETAILS]: () => apiError(502) });

      expect(await result).toEqual({ state: expect.any(Object) });
    });

    it('reports timed_out at the deadline even when the details read keeps failing', async () => {
      const { result } = poll(
        { [DETAILS]: () => apiError(502) },
        { deadline: new Date(Date.now() - 1000).toISOString() }
      );

      const { output } = (await result) as { output: Record<string, unknown> };

      expect(output).toMatchObject({ status: 'timed_out' });
    });

    it('returns STATUS_UNREADABLE_FORBIDDEN when the results read is forbidden', async () => {
      const { result } = poll({
        [DETAILS]: () => ({ data: { queries: [counters({ docs: 1 })] } }),
        [RESULTS]: () => apiError(403),
      });

      const { output } = (await result) as { output: Record<string, unknown> };

      expect(output).toMatchObject({ error_code: 'STATUS_UNREADABLE_FORBIDDEN' });
    });
  });

  describe('definition', () => {
    it('uses the response action poll policy and both ceilings', () => {
      expect(runQueryStepDefinition.policy).toEqual({
        strategy: 'exponential',
        initialMs: 5000,
        maxMs: 30000,
        jitter: true,
      });
      expect(runQueryStepDefinition.ceilings).toEqual({ maxAttempts: 150, maxWaitMs: 30000 });
    });

    it('rejects ad-hoc SQL and requires exactly one target', () => {
      const schema = runQueryStepDefinition.inputSchema as any;
      const resolved = typeof schema === 'function' ? schema() : schema;

      expect(resolved.safeParse({ saved_query: 'a', agent_ids: ['x'] }).success).toBe(true);
      expect(
        resolved.safeParse({ saved_query: 'a', agent_ids: ['x'], wait_timeout: '30m' }).success
      ).toBe(true);
      expect(
        resolved.safeParse({ saved_query: 'a', agent_ids: ['x'], wait_timeout: '31m' }).success
      ).toBe(false);
      expect(
        resolved.safeParse({ saved_query: 'a', agent_ids: ['x'], wait_timeout: '1h' }).success
      ).toBe(false);
      expect(resolved.safeParse({ saved_query: 'a' }).success).toBe(false);
      expect(
        resolved.safeParse({ saved_query: 'a', agent_ids: ['x'], agent_platforms: ['linux'] })
          .success
      ).toBe(false);
      expect(
        resolved.safeParse({ saved_query: 'a', agent_platforms: ['linux', 'darwin', 'windows'] })
          .success
      ).toBe(true);
      expect(resolved.safeParse({ saved_query: 'a', agent_platforms: ['ubuntu'] }).success).toBe(
        false
      );
      expect(resolved.safeParse({ saved_query: 'a/b', agent_ids: ['x'] }).success).toBe(false);
      expect(
        resolved.safeParse({ saved_query: 'a', agent_ids: ['x'], query: 'select 1' }).success
      ).toBe(false);
      expect(
        resolved.safeParse({ saved_query: 'a', agent_ids: ['x'], alert_ids: ['alert-1'] }).success
      ).toBe(false);
    });
  });
});
