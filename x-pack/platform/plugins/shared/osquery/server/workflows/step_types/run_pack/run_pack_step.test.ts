/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { runPackStepDefinition } from './run_pack_step';
import { apiError, createContextManager, createLogger, resultEdges } from '../../test_helpers';

const READ_PACK = 'GET /api/osquery/packs/pack-so-id';
const RESOLVE = 'GET /internal/osquery/packs/_resolve_prebuilt/forensic-persistence';
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
      { id: 'cron', action_id: 'qa-cron' },
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

const start = (routes: Routes, input: Record<string, unknown> = { pack_id: 'pack-so-id' }) => {
  const contextManager = createContextManager({
    [READ_PACK]: () => PACK,
    [RESOLVE]: () => ({ pack_id: 'pack-so-id' }),
    [POST]: () => dispatchBody,
    ...routes,
  });

  return {
    contextManager,
    result: Promise.resolve(
      runPackStepDefinition.start!({
        input: { agent_ids: ['agent-1'], ...input },
        contextManager,
        logger: createLogger(),
      } as never)
    ),
  };
};

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

const poll = (routes: Routes, state: Record<string, unknown> = {}) =>
  Promise.resolve(
    runPackStepDefinition.poll!({
      state: { ...baseState, ...state },
      contextManager: createContextManager(routes),
      logger: createLogger(),
      attempt: 1,
    } as never)
  );

describe('osquery.runPack step', () => {
  describe('start', () => {
    it('sends exactly one POST with pack_id, never a query or alert_ids', async () => {
      const { contextManager, result } = start({});

      const { state } = (await result) as { state: Record<string, any> };

      const posts = contextManager.callKibanaApi.mock.calls.filter(([c]) => c.method === 'POST');
      expect(posts).toHaveLength(1);
      expect((posts[0][0] as { body: object }).body).toEqual({
        pack_id: 'pack-so-id',
        agent_ids: ['agent-1'],
      });
      expect(state.queries).toEqual([
        { query_id: 'cron', action_id: 'qa-cron', ecs_keys: ['cron.command'] },
        { query_id: 'launchd', action_id: 'qa-launchd', ecs_keys: [] },
      ]);
    });

    it('resolves prebuilt_pack through the internal route and runs the space copy', async () => {
      const { contextManager, result } = start({}, { prebuilt_pack: 'forensic-persistence' });

      await result;

      const post = contextManager.callKibanaApi.mock.calls.find(
        ([c]) => c.method === 'POST'
      )![0] as {
        body: Record<string, unknown>;
      };
      expect(post.body.pack_id).toBe('pack-so-id');
      expect(contextManager.callKibanaApi.mock.calls[0][0]).toMatchObject({
        path: '/internal/osquery/packs/_resolve_prebuilt/forensic-persistence',
        headers: { 'elastic-api-version': '1' },
      });
    });

    it('fails with PREBUILT_PACK_NOT_LOADED when the space has no copy, before dispatch', async () => {
      const { contextManager, result } = start(
        { [RESOLVE]: () => apiError(404) },
        { prebuilt_pack: 'forensic-persistence' }
      );

      await expect(result).rejects.toMatchObject({
        details: { code: 'PREBUILT_PACK_NOT_LOADED' },
        message: expect.stringContaining('Load Elastic prebuilt packs in this space'),
      });
      expect(contextManager.callKibanaApi.mock.calls.some(([c]) => c.method === 'POST')).toBe(
        false
      );
    });

    it('rejects both pack_id and prebuilt_pack with INVALID_INPUT before any call', async () => {
      const { contextManager, result } = start(
        {},
        { pack_id: 'pack-so-id', prebuilt_pack: 'forensic-persistence' }
      );

      await expect(result).rejects.toMatchObject({ details: { code: 'INVALID_INPUT' } });
      expect(contextManager.callKibanaApi).not.toHaveBeenCalled();
    });

    it('fails with PREBUILT_PACK_AMBIGUOUS when two prebuilt packs share the name', async () => {
      const { contextManager, result } = start(
        { [RESOLVE]: () => apiError(409) },
        { prebuilt_pack: 'forensic-persistence' }
      );

      await expect(result).rejects.toMatchObject({
        details: { code: 'PREBUILT_PACK_AMBIGUOUS' },
      });
      expect(contextManager.callKibanaApi.mock.calls.some(([c]) => c.method === 'POST')).toBe(
        false
      );
    });

    it('fails with PACK_NOT_FOUND for an unknown pack_id, before dispatch', async () => {
      const { contextManager, result } = start({ [READ_PACK]: () => apiError(404) });

      await expect(result).rejects.toMatchObject({ details: { code: 'PACK_NOT_FOUND' } });
      expect(contextManager.callKibanaApi.mock.calls.some(([c]) => c.method === 'POST')).toBe(
        false
      );
    });

    it('rejects a pack whose enabled query has placeholders but ignores disabled ones', async () => {
      const { result: fine } = start({});
      await expect(fine).resolves.toHaveProperty('state');

      const { result } = start({
        [READ_PACK]: () => ({
          data: { queries: { bad: { query: "SELECT '{{user.name}}'" } } },
        }),
      });
      await expect(result).rejects.toMatchObject({
        details: { code: 'SAVED_QUERY_HAS_PLACEHOLDERS' },
      });
    });

    it('returns DISPATCH_UNCONFIRMED on a 5xx and does not retry', async () => {
      const { contextManager, result } = start({ [POST]: () => apiError(500) });

      const { output } = (await result) as { output: Record<string, unknown> };

      expect(output).toEqual({ status: 'failed', error_code: 'DISPATCH_UNCONFIRMED', queries: [] });
      expect(
        contextManager.callKibanaApi.mock.calls.filter(([c]) => c.method === 'POST')
      ).toHaveLength(1);
    });
  });

  describe('poll', () => {
    const twoQueries = (cron: Record<string, number>, launchd: Record<string, number>) => () => ({
      data: { queries: [counters('qa-cron', cron), counters('qa-launchd', launchd)] },
    });

    it('is success when every query is a success, with one block per query', async () => {
      const { output } = (await poll({
        [DETAILS]: twoQueries({ docs: 2 }, { docs: 1 }),
        [resultsFor('qa-cron')]: () => ({ data: { edges: resultEdges(2) } }),
        [resultsFor('qa-launchd')]: () => ({ data: { edges: resultEdges(1) } }),
      })) as { output: Record<string, any> };

      expect(output.status).toBe('success');
      expect(output.action_id).toBe('action-1');
      expect(
        output.queries.map((q: any) => [q.query_id, q.action_id, q.status, q.row_count])
      ).toEqual([
        ['cron', 'qa-cron', 'success', 2],
        ['launchd', 'qa-launchd', 'success', 1],
      ]);
      expect(output.queries[0].rows[0].ecs).toEqual({});
    });

    it('is partial for a mix of success and failed queries', async () => {
      const { output } = (await poll({
        [DETAILS]: twoQueries({ docs: 1 }, { failed: 1, successful: 0 }),
        [resultsFor('qa-cron')]: () => ({ data: { edges: resultEdges(1) } }),
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
        { deadline: new Date(Date.now() - 1000).toISOString() }
      )) as { output: Record<string, unknown> };

      expect(output.status).toBe('timed_out');
    });

    it('keeps polling while one query still has pending agents', async () => {
      const result = await poll({
        [DETAILS]: twoQueries({ docs: 0 }, { pending: 1, responded: 0, successful: 0 }),
      });

      expect(result).toEqual({ state: expect.any(Object) });
    });

    it('applies max_rows to each query', async () => {
      const { output } = (await poll(
        {
          [DETAILS]: twoQueries({ docs: 500 }, { docs: 500 }),
          [resultsFor('qa-cron')]: () => ({ data: { edges: resultEdges(200) } }),
          [resultsFor('qa-launchd')]: () => ({ data: { edges: resultEdges(200) } }),
        },
        { max_rows: 150 }
      )) as { output: { queries: Array<{ rows: unknown[]; truncated: boolean }> } };

      expect(output.queries.map((q) => q.rows.length)).toEqual([150, 150]);
      expect(output.queries.every((q) => q.truncated)).toBe(true);
    });

    it('counts the 8MB output bound across all queries', async () => {
      const fat = {
        _source: {
          agent: { id: 'agent-1' },
          osquery: { blob: 'x'.repeat(1024 * 1024) },
        },
      };
      const edges = Array.from({ length: 5 }, () => fat);
      const { output } = (await poll(
        {
          [DETAILS]: twoQueries({ docs: 5 }, { docs: 5 }),
          [resultsFor('qa-cron')]: () => ({ data: { edges } }),
          [resultsFor('qa-launchd')]: () => ({ data: { edges } }),
        },
        { deadline: new Date(Date.now() + 60_000).toISOString() }
      )) as { output: { queries: Array<{ rows: unknown[]; truncated: boolean }> } };

      const total = output.queries.reduce((sum, q) => sum + q.rows.length, 0);
      expect(total).toBeLessThanOrEqual(7);
      expect(total).toBeGreaterThan(0);
      expect(output.queries.some((q) => q.truncated)).toBe(true);
    });

    it('returns STATUS_UNREADABLE_FORBIDDEN on a 403 and never throws', async () => {
      const { output } = (await poll({ [DETAILS]: () => apiError(403) })) as {
        output: Record<string, unknown>;
      };

      expect(output).toEqual({
        status: 'failed',
        error_code: 'STATUS_UNREADABLE_FORBIDDEN',
        action_id: 'action-1',
        queries: [],
      });
    });
  });

  describe('input schema', () => {
    const resolved = () => {
      const schema = runPackStepDefinition.inputSchema as any;

      return typeof schema === 'function' ? schema() : schema;
    };

    it('requires exactly one of pack_id and prebuilt_pack', () => {
      expect(resolved().safeParse({ pack_id: 'p', agent_ids: ['a'] }).success).toBe(true);
      expect(resolved().safeParse({ prebuilt_pack: 'p', agent_ids: ['a'] }).success).toBe(true);
      expect(resolved().safeParse({ agent_ids: ['a'] }).success).toBe(false);
      expect(
        resolved().safeParse({ pack_id: 'p', prebuilt_pack: 'q', agent_ids: ['a'] }).success
      ).toBe(false);
    });

    it('rejects alert_ids and agent_all', () => {
      expect(
        resolved().safeParse({ pack_id: 'p', agent_ids: ['a'], alert_ids: ['x'] }).success
      ).toBe(false);
      expect(resolved().safeParse({ pack_id: 'p', agent_all: true }).success).toBe(false);
    });
  });
});
