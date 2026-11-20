/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExecutionError } from '@kbn/workflows/server';
import { OSQUERY_MAX_AGENTS_HEADER } from '../../../../common/constants';
import {
  DEADLINE_READ_GRACE_POLLS,
  OUTPUT_BUDGET_BYTES,
  RESULTS_SETTLE_POLLS,
  TARGET_AGENT_LIMIT,
} from '../../../../common/workflows/contract/budget';
import { runPackStepDefinition } from './run_pack_step';
import { apiError, createContextManager, createLogger, resultEdges } from '../../test_helpers';

const FIND_PACKS = 'GET /api/osquery/packs';
const READ_PACK = 'GET /api/osquery/packs/pack-so-id';
const RESOLVE = 'GET /internal/osquery/packs/_resolve_prebuilt/forensic-persistence';
const AGENTS = 'GET /internal/osquery/fleet_wrapper/agents';
const LIST = 'GET /api/osquery/live_queries';
const POST = 'POST /api/osquery/live_queries';
const DETAILS = 'GET /api/osquery/live_queries/action-1';
const resultsFor = (queryActionId: string) =>
  `GET /api/osquery/live_queries/action-1/results/${queryActionId}`;

const PACK = {
  data: {
    queries: {
      cron: {
        query: 'SELECT * FROM crontab',
        ecs_mapping: { 'cron.command': { field: 'command' } },
      },
      launchd: { query: 'SELECT * FROM launchd' },
      off: { query: 'SELECT {{ x }}', enabled: false },
    },
  },
};

const dispatchBody = {
  data: {
    action_id: 'action-1',
    agents: ['agent-1'],
    queries: [
      { id: 'cron', action_id: 'qa-cron', ecs_mapping: { 'cron.command': { field: 'command' } } },
      { id: 'launchd', action_id: 'qa-launchd' },
    ],
  },
};

const counters = (actionId: string, overrides: Record<string, number> = {}) => ({
  action_id: actionId,
  docs: 0,
  pending: 0,
  responded: 1,
  successful: 1,
  failed: 0,
  ...overrides,
});

type Routes = Parameters<typeof createContextManager>[0];

const start = (routes: Routes, input: Record<string, unknown> = { pack: 'My pack' }) => {
  const contextManager = createContextManager({
    [FIND_PACKS]: () => ({
      total: 1,
      data: [{ saved_object_id: 'pack-so-id', name: 'My pack' }],
    }),
    [READ_PACK]: () => PACK,
    [RESOLVE]: () => ({ pack_id: 'pack-so-id' }),
    [LIST]: () => ({ data: { items: [] } }),
    [POST]: () => dispatchBody,
    ...routes,
  });
  const logger = createLogger();

  return {
    contextManager,
    logger,
    result: Promise.resolve(
      runPackStepDefinition.start!({
        input: { agent_ids: ['agent-1'], ...input },
        contextManager,
        logger,
      } as never)
    ),
  };
};

const posted = (contextManager: ReturnType<typeof createContextManager>) =>
  contextManager.callKibanaApi.mock.calls.filter(([call]) => call.method === 'POST');

const baseState = {
  action_id: 'action-1',
  deadline: new Date(Date.now() + 60_000).toISOString(),
  max_rows: 1000,
  agents_total: 1,
  queries: [
    { query_id: 'cron', action_id: 'qa-cron', ecs_keys: ['cron.command'] },
    { query_id: 'launchd', action_id: 'qa-launchd', ecs_keys: [] },
  ],
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

const poll = (routes: Routes, state: Record<string, unknown> = {}) =>
  Promise.resolve(
    runPackStepDefinition.poll!({
      state: { ...baseState, ...state },
      contextManager: createContextManager(routes),
      logger: createLogger(),
      attempt: 1,
    } as never)
  );

const pastDeadline = () => new Date(Date.now() - 1000).toISOString();

describe('osquery.runPack step', () => {
  describe('start', () => {
    it('sends exactly one POST with the resolved pack_id and the target, never a query or alert_ids', async () => {
      const { contextManager, result } = start({});

      const { state } = (await result) as { state: Record<string, any> };

      const posts = posted(contextManager);
      expect(posts).toHaveLength(1);
      expect(posts[0][0]).toMatchObject({
        path: '/api/osquery/live_queries',
        headers: { [OSQUERY_MAX_AGENTS_HEADER]: String(TARGET_AGENT_LIMIT) },
      });
      expect((posts[0][0] as { body: object }).body).toEqual({
        pack_id: 'pack-so-id',
        agent_ids: ['agent-1'],
      });
      expect(state).toMatchObject({ action_id: 'action-1', agents_total: 1, max_rows: 1000 });
      expect(state.queries).toEqual([
        { query_id: 'cron', action_id: 'qa-cron', ecs_keys: ['cron.command'] },
        { query_id: 'launchd', action_id: 'qa-launchd', ecs_keys: [] },
      ]);
    });

    it('takes ecs_keys from what the route dispatched over the pre-dispatch read of the pack', async () => {
      // The pack changed between the read and the POST: the route dispatched other mappings.
      const { result } = start({
        [POST]: () => ({
          data: {
            ...dispatchBody.data,
            queries: [
              { id: 'cron', action_id: 'qa-cron', ecs_mapping: { 'process.name': {} } },
              { id: 'launchd', action_id: 'qa-launchd', ecs_mapping: [{ key: 'host.name' }, {}] },
            ],
          },
        }),
      });

      const { state } = (await result) as { state: { queries: unknown[] } };

      expect(state.queries).toEqual([
        { query_id: 'cron', action_id: 'qa-cron', ecs_keys: ['process.name'] },
        { query_id: 'launchd', action_id: 'qa-launchd', ecs_keys: ['host.name'] },
      ]);
    });

    it('drops ecs_keys the pack had at read time when the route dispatched no mapping', async () => {
      // The mapping was removed between the read and the POST: the route omits an empty mapping.
      const { result } = start({
        [POST]: () => ({
          data: {
            ...dispatchBody.data,
            queries: [
              { id: 'cron', action_id: 'qa-cron' },
              { id: 'launchd', action_id: 'qa-launchd' },
            ],
          },
        }),
      });

      const { state } = (await result) as { state: { queries: unknown[] } };

      expect(state.queries).toEqual([
        { query_id: 'cron', action_id: 'qa-cron', ecs_keys: [] },
        { query_id: 'launchd', action_id: 'qa-launchd', ecs_keys: [] },
      ]);
    });

    it('sends policy targeting as agent_policy_ids', async () => {
      const { contextManager, result } = start(
        { [AGENTS]: () => ({ total: 3 }) },
        { pack: 'My pack', agent_ids: undefined, agent_policy_ids: ['pol-1'] }
      );

      await result;

      expect((posted(contextManager)[0][0] as { body: object }).body).toEqual({
        pack_id: 'pack-so-id',
        agent_policy_ids: ['pol-1'],
      });
    });

    it('checks the target, then finds and reads the pack, then live query read access, then dispatches', async () => {
      const { contextManager, result } = start(
        { [AGENTS]: () => ({ total: 3 }) },
        { pack: 'My pack', agent_ids: undefined, agent_policy_ids: ['pol-1'] }
      );

      await result;

      expect(
        contextManager.callKibanaApi.mock.calls.map(([call]) => `${call.method} ${call.path}`)
      ).toEqual([AGENTS, FIND_PACKS, READ_PACK, LIST, POST]);
    });

    it('passes the step logger to the target resolution', async () => {
      const { logger, result } = start(
        {
          [AGENTS]: () => ({
            groups: {
              platforms: [
                { id: 'ubuntu', size: 1 },
                { id: 'not', size: 1 },
              ],
            },
          }),
        },
        { pack: 'My pack', agent_ids: undefined, agent_platforms: ['linux'] }
      );

      await result;

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('"not"'));
    });

    it('resolves prebuilt_pack through the internal route and runs the space copy', async () => {
      const { contextManager, result } = start({}, { prebuilt_pack: 'forensic-persistence' });

      await result;

      expect(contextManager.callKibanaApi.mock.calls[0][0]).toMatchObject({
        path: '/internal/osquery/packs/_resolve_prebuilt/forensic-persistence',
      });
      expect((posted(contextManager)[0][0] as { body: Record<string, unknown> }).body.pack_id).toBe(
        'pack-so-id'
      );
    });

    it('sets the deadline from wait_timeout and keeps max_rows in state', async () => {
      const before = Date.now();
      const { result } = start({}, { pack: 'My pack', wait_timeout: '10m', max_rows: 7 });

      const { state } = (await result) as { state: { deadline: string; max_rows: number } };

      const deadline = new Date(state.deadline).getTime();
      expect(deadline).toBeGreaterThanOrEqual(before + 10 * 60_000);
      expect(deadline).toBeLessThanOrEqual(Date.now() + 10 * 60_000);
      expect(state.max_rows).toBe(7);
    });

    describe('before dispatch', () => {
      it.each<[string, Routes, Record<string, unknown>, string]>([
        [
          'both pack and prebuilt_pack',
          {},
          { pack: 'My pack', prebuilt_pack: 'forensic-persistence' },
          'INVALID_INPUT',
        ],
        ['neither pack nor prebuilt_pack', {}, { pack: undefined }, 'INVALID_INPUT'],
        ['an unknown key (alert_ids)', {}, { pack: 'My pack', alert_ids: ['a'] }, 'INVALID_INPUT'],
        [
          'an unknown pack name',
          { [FIND_PACKS]: () => ({ total: 0, data: [] }) },
          {},
          'PACK_NOT_FOUND',
        ],
        [
          'a pack name shared by two packs',
          {
            [FIND_PACKS]: () => ({
              total: 2,
              data: [
                { saved_object_id: 'so-1', name: 'My pack' },
                { saved_object_id: 'so-2', name: 'My pack' },
              ],
            }),
          },
          {},
          'PACK_AMBIGUOUS',
        ],
        [
          'a prebuilt pack not loaded',
          { [RESOLVE]: () => apiError(404) },
          { pack: undefined, prebuilt_pack: 'forensic-persistence' },
          'PREBUILT_PACK_NOT_LOADED',
        ],
        [
          'an ambiguous prebuilt name',
          { [RESOLVE]: () => apiError(409) },
          { pack: undefined, prebuilt_pack: 'forensic-persistence' },
          'PREBUILT_PACK_AMBIGUOUS',
        ],
        [
          'no packs read privilege',
          { [READ_PACK]: () => apiError(403, 'Forbidden') },
          {},
          'MISSING_PRIVILEGE',
        ],
        [
          'a placeholder in an enabled query',
          {
            [READ_PACK]: () => ({
              data: { queries: { bad: { query: "SELECT '{{host.name}}'" } } },
            }),
          },
          {},
          'PACK_QUERY_HAS_PLACEHOLDERS',
        ],
        [
          'no enabled query',
          {
            [READ_PACK]: () => ({
              data: { queries: { off: { query: 'SELECT 1', enabled: false } } },
            }),
          },
          {},
          'PACK_HAS_NO_ENABLED_QUERIES',
        ],
        [
          'no live_queries_read privilege',
          { [LIST]: () => apiError(403, 'Forbidden') },
          {},
          'MISSING_PRIVILEGE',
        ],
      ])('dispatches nothing for %s', async (_name, routes, input, code) => {
        const { contextManager, result } = start(routes, {
          pack: 'My pack',
          ...input,
        });

        const error = (await result.catch((e) => e)) as ExecutionError;

        expect(error.details).toEqual({ code });
        expect(posted(contextManager)).toHaveLength(0);
      });

      it('names live_queries_read when the caller cannot read live queries', async () => {
        const { result } = start({ [LIST]: () => apiError(403, 'Forbidden') });

        const error = (await result.catch((e) => e)) as ExecutionError;

        expect(error.message).toMatch(/live_queries_read/);
      });

      it('makes no call at all for an invalid input', async () => {
        const { contextManager, result } = start(
          {},
          { pack: 'My pack', prebuilt_pack: 'forensic-persistence' }
        );

        await result.catch(() => undefined);

        expect(contextManager.callKibanaApi).not.toHaveBeenCalled();
      });

      it('does not read the pack when the target cannot be resolved', async () => {
        const { contextManager, result } = start(
          { [AGENTS]: () => ({ total: TARGET_AGENT_LIMIT + 1 }) },
          { pack: 'My pack', agent_ids: undefined, agent_policy_ids: ['pol-1'] }
        );

        await expect(result).rejects.toMatchObject({ details: { code: 'TARGET_LIMIT_EXCEEDED' } });
        expect(
          contextManager.callKibanaApi.mock.calls.some(([call]) => call.path === READ_PACK.slice(4))
        ).toBe(false);
      });
    });

    it('maps the route agent ceiling to TARGET_LIMIT_EXCEEDED', async () => {
      const { result } = start({
        [POST]: () => apiError(400, 'too many', 'AGENT_LIMIT_EXCEEDED'),
      });

      await expect(result).rejects.toMatchObject({ details: { code: 'TARGET_LIMIT_EXCEEDED' } });
    });

    it('returns DISPATCH_UNCONFIRMED on a 5xx and does not retry', async () => {
      const { contextManager, result } = start({ [POST]: () => apiError(500) });

      const { output } = (await result) as { output: Record<string, unknown> };

      expect(output).toEqual({ status: 'failed', error_code: 'DISPATCH_UNCONFIRMED', queries: [] });
      expect(posted(contextManager)).toHaveLength(1);
    });

    it('returns DISPATCH_UNCONFIRMED when the response carries no query ids', async () => {
      const { result } = start({
        [POST]: () => ({ data: { action_id: 'action-1', queries: [] } }),
      });

      const { output } = (await result) as { output: Record<string, unknown> };

      expect(output).toMatchObject({ status: 'failed', error_code: 'DISPATCH_UNCONFIRMED' });
    });
  });

  describe('poll', () => {
    const twoQueries = (cron: Record<string, number>, launchd: Record<string, number>) => () => ({
      data: { queries: [counters('qa-cron', cron), counters('qa-launchd', launchd)] },
    });

    it('is success when every query is a success, with one entry per query', async () => {
      const { output } = (await poll({
        [DETAILS]: twoQueries({ docs: 2 }, { docs: 1 }),
        [resultsFor('qa-cron')]: resultsRoute(2),
        [resultsFor('qa-launchd')]: resultsRoute(1),
      })) as { output: Record<string, any> };

      expect(output.status).toBe('success');
      expect(output.action_id).toBe('action-1');
      expect(output.error_code).toBeUndefined();
      expect(
        output.queries.map((q: any) => [q.query_id, q.action_id, q.status, q.row_count])
      ).toEqual([
        ['cron', 'qa-cron', 'success', 2],
        ['launchd', 'qa-launchd', 'success', 1],
      ]);
      expect(output.queries[0].rows[0].ecs).toEqual({});
      expect(output.queries[0].agents).toEqual({ total: 1, responded: 1, pending: 0, failed: 0 });
    });

    it('only keeps the ecs_mapping keys of each query', async () => {
      const { output } = (await poll(
        {
          [DETAILS]: twoQueries({ docs: 1 }, { docs: 1 }),
          [resultsFor('qa-cron')]: resultsRoute(1),
          [resultsFor('qa-launchd')]: resultsRoute(1),
        },
        {
          queries: [
            { query_id: 'cron', action_id: 'qa-cron', ecs_keys: ['process.name'] },
            { query_id: 'launchd', action_id: 'qa-launchd', ecs_keys: [] },
          ],
        }
      )) as { output: Record<string, any> };

      expect(output.queries[0].rows[0].ecs).toEqual({ 'process.name': 'bash' });
      expect(output.queries[1].rows[0].ecs).toEqual({});
    });

    it('is partial for a mix of success and failed queries', async () => {
      const { output } = (await poll({
        [DETAILS]: twoQueries({ docs: 1 }, { failed: 1, successful: 0 }),
        [resultsFor('qa-cron')]: resultsRoute(1),
      })) as { output: Record<string, any> };

      expect(output.status).toBe('partial');
      expect(output.queries.map((q: any) => q.status)).toEqual(['success', 'failed']);
    });

    it('is failed when no query succeeded', async () => {
      const failed = { failed: 1, successful: 0 };
      const { output } = (await poll({ [DETAILS]: twoQueries(failed, failed) })) as {
        output: Record<string, unknown>;
      };

      expect(output.status).toBe('failed');
    });

    it('is timed_out when no query got a response by the deadline', async () => {
      const silent = { pending: 1, responded: 0, successful: 0 };
      const { output } = (await poll(
        { [DETAILS]: twoQueries(silent, silent) },
        { deadline: pastDeadline() }
      )) as { output: Record<string, unknown> };

      expect(output.status).toBe('timed_out');
    });

    it('is partial when one query answered and the other timed out at the deadline', async () => {
      const { output } = (await poll(
        {
          [DETAILS]: twoQueries({}, { pending: 1, responded: 0, successful: 0 }),
        },
        { deadline: pastDeadline() }
      )) as { output: Record<string, any> };

      expect(output.status).toBe('partial');
      expect(output.queries.map((q: any) => q.status)).toEqual(['success', 'timed_out']);
    });

    it('keeps polling while one query still has pending agents', async () => {
      const result = await poll({
        [DETAILS]: twoQueries({ docs: 0 }, { pending: 1, responded: 0, successful: 0 }),
      });

      expect(result).toEqual({ state: expect.any(Object) });
    });

    it('returns the reading state on pending so the settle counters advance', async () => {
      const result = (await poll({
        [DETAILS]: twoQueries({ docs: 5 }, { docs: 0 }),
        // Only two of five rows are searchable yet.
        [resultsFor('qa-cron')]: resultsRoute(2),
      })) as { state: { queries: Array<Record<string, unknown>> } };

      expect(result.state.queries[0]).toMatchObject({
        query_id: 'cron',
        indexed: 2,
        stalled_polls: 0,
      });
    });

    it('reads what exists once the searchable count stalled for RESULTS_SETTLE_POLLS polls', async () => {
      const { output } = (await poll(
        {
          [DETAILS]: twoQueries({ docs: 5 }, { docs: 0 }),
          [resultsFor('qa-cron')]: resultsRoute(2),
        },
        {
          queries: [
            {
              ...baseState.queries[0],
              indexed: 2,
              stalled_polls: RESULTS_SETTLE_POLLS - 1,
            },
            baseState.queries[1],
          ],
        }
      )) as { output: Record<string, any> };

      expect(output.queries[0]).toMatchObject({ row_count: 5, truncated: true });
      expect(output.queries[0].rows).toHaveLength(2);
    });

    it('applies max_rows to each query', async () => {
      const { output } = (await poll(
        {
          [DETAILS]: twoQueries({ docs: 500 }, { docs: 500 }),
          [resultsFor('qa-cron')]: resultsRoute(500),
          [resultsFor('qa-launchd')]: resultsRoute(500),
        },
        { max_rows: 150 }
      )) as {
        output: { queries: Array<{ rows: unknown[]; truncated: boolean; row_count: number }> };
      };

      expect(output.queries.map((q) => q.rows.length)).toEqual([150, 150]);
      expect(output.queries.map((q) => q.row_count)).toEqual([500, 500]);
      expect(output.queries.every((q) => q.truncated)).toBe(true);
    });

    it('spends one 8MB budget across all queries', async () => {
      const fat = {
        _source: { agent: { id: 'agent-1' }, osquery: { blob: 'x'.repeat(1024 * 1024) } },
      };
      const edges = Array.from({ length: 5 }, () => fat);
      const { output } = (await poll(
        {
          [DETAILS]: twoQueries({ docs: 5 }, { docs: 5 }),
          [resultsFor('qa-cron')]: () => ({ data: { edges, total: 5 } }),
          [resultsFor('qa-launchd')]: () => ({ data: { edges, total: 5 } }),
        },
        { deadline: pastDeadline() }
      )) as {
        output: {
          queries: Array<{ rows: unknown[]; truncated: boolean }>;
          error_code?: string;
        };
      };

      const bytes = output.queries
        .flatMap((q) => q.rows)
        .reduce<number>((sum, row) => sum + Buffer.byteLength(JSON.stringify(row), 'utf8'), 0);
      expect(bytes).toBeLessThanOrEqual(OUTPUT_BUDGET_BYTES);
      // 5 rows of ~1MB fit in the first query; only 2 more fit in the second.
      expect(output.queries.map((q) => q.rows.length)).toEqual([5, 2]);
      expect(output.queries.map((q) => q.truncated)).toEqual([false, true]);
      expect(output.error_code).toBeUndefined();
    });

    it('lifts RESULTS_UNREADABLE to the top level and strips the internal flag', async () => {
      const { output } = (await poll(
        {
          [DETAILS]: twoQueries({ docs: 20 }, { docs: 0 }),
          [resultsFor('qa-cron')]: () => apiError(500),
        },
        { deadline: pastDeadline() }
      )) as { output: Record<string, any> };

      expect(output).toMatchObject({ status: 'success', error_code: 'RESULTS_UNREADABLE' });
      expect(output.queries[0]).toMatchObject({ rows: [], row_count: 20, truncated: true });
      for (const query of output.queries) {
        expect(query).not.toHaveProperty('results_unreadable');
      }
    });

    it.each([401, 403])(
      'returns STATUS_UNREADABLE_FORBIDDEN on a %s and never throws',
      async (status) => {
        const { output } = (await poll({ [DETAILS]: () => apiError(status) })) as {
          output: Record<string, unknown>;
        };

        expect(output).toEqual({
          status: 'failed',
          error_code: 'STATUS_UNREADABLE_FORBIDDEN',
          action_id: 'action-1',
          queries: [],
        });
      }
    );

    it('returns STATUS_UNREADABLE_FORBIDDEN when the results read is forbidden', async () => {
      const { output } = (await poll({
        [DETAILS]: twoQueries({ docs: 1 }, { docs: 0 }),
        [resultsFor('qa-cron')]: () => apiError(403),
      })) as { output: Record<string, unknown> };

      expect(output).toMatchObject({ error_code: 'STATUS_UNREADABLE_FORBIDDEN', queries: [] });
    });

    it('returns ACTION_NOT_VISIBLE on a 404', async () => {
      const { output } = (await poll({ [DETAILS]: () => apiError(404) })) as {
        output: Record<string, unknown>;
      };

      expect(output).toMatchObject({ status: 'failed', error_code: 'ACTION_NOT_VISIBLE' });
    });

    it('retries a failed status read after the deadline before giving up', async () => {
      const first = (await poll(
        { [DETAILS]: () => apiError(500) },
        { deadline: pastDeadline() }
      )) as { state: { deadline_read_failures?: number } };
      expect(first.state.deadline_read_failures).toBe(1);

      const last = (await poll(
        { [DETAILS]: () => apiError(500) },
        { deadline: pastDeadline(), deadline_read_failures: DEADLINE_READ_GRACE_POLLS }
      )) as { output: Record<string, unknown> };
      expect(last.output).toMatchObject({ status: 'timed_out' });
    });
  });

  describe('input schema', () => {
    it('requires exactly one of pack and prebuilt_pack', () => {
      const schema = runPackStepDefinition.inputSchema;

      expect(schema.safeParse({ pack: 'p', agent_ids: ['a'] }).success).toBe(true);
      expect(schema.safeParse({ prebuilt_pack: 'p', agent_ids: ['a'] }).success).toBe(true);
      expect(schema.safeParse({ agent_ids: ['a'] }).success).toBe(false);
      expect(schema.safeParse({ pack: 'p', prebuilt_pack: 'q', agent_ids: ['a'] }).success).toBe(
        false
      );
    });
  });
});
