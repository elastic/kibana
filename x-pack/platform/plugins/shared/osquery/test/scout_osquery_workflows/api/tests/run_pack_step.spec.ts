/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { KibanaRole } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  answerQuery,
  apiTest,
  createOsqueryAgentPolicy,
  createPack,
  createSystemIndicesClient,
  createTestSpace,
  deleteAgentPolicy,
  deleteAnsweredQueries,
  deleteDispatchedActions,
  deleteFakeAgents,
  deleteLeftoverWorkflows,
  deleteLoadedPrebuiltPacks,
  deletePack,
  deleteSystemIndicesUser,
  deleteTestSpace,
  findAgentActionIds,
  findPackActionDocs,
  indexFakeAgents,
  loadPrebuiltPacks,
  stepOf,
  takeDispatchedActionIds,
  workflowsClient,
  type FakeAgent,
} from '../fixtures';

/**
 * Loading the prebuilt packs is space-wide, so that case runs in a space this spec owns: it never
 * sees or deletes prebuilt packs a user (or another spec) loaded in the default space.
 */
const PREBUILT_SPACE = 'osq-wf-run-pack-prebuilt';
const AGENT: FakeAgent = {
  id: 'osq-wf-rp-agent',
  hostname: 'rp-host',
  platform: 'ubuntu',
  namespaces: ['default', PREBUILT_SPACE],
};
const PREBUILT_PACK = 'forensic-persistence';

const runPackStep = (pack: string, extra = '') => `  - name: p
    type: osquery.runPack
    with:
      ${pack}
      agent_ids: ["${AGENT.id}"]
${extra}`;

const osqueryRole = (osquery: string[]): KibanaRole => ({
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { osquery, workflowsManagement: ['all'] }, spaces: ['*'] }],
});

apiTest.describe('osquery.runPack workflow step', { tag: ['@local-stateful-classic'] }, () => {
  let systemEs: Client;
  let policyId: string;
  let packId: string;
  let placeholderPackId: string;
  let adminHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ esClient, kbnClient, config, requestAuth }) => {
    systemEs = await createSystemIndicesClient(esClient, config);
    policyId = await createOsqueryAgentPolicy(kbnClient, 'osq-wf-run-pack');
    await indexFakeAgents(systemEs, policyId, [AGENT]);
    packId = await createPack(kbnClient, 'osq-wf-pack', {
      procs: {
        query: 'SELECT pid, name FROM processes',
        interval: 3600,
        ecs_mapping: { 'process.name': { field: 'name' } },
      },
      users: { query: 'SELECT uid FROM users', interval: 3600 },
      skip: { query: 'SELECT 1', interval: 3600, enabled: false },
    });
    placeholderPackId = await createPack(kbnClient, 'osq-wf-pack-placeholder', {
      host: { query: "SELECT '{{host.name}}' AS name", interval: 3600 },
    });
    await createTestSpace(kbnClient, PREBUILT_SPACE);
    // The space is ours: a previous, interrupted run may have left prebuilt copies in it.
    await deleteLoadedPrebuiltPacks(kbnClient, PREBUILT_SPACE);
    ({ apiKeyHeader: adminHeaders } = await requestAuth.getApiKeyForAdmin());
  });

  apiTest.afterEach(async () => {
    await deleteLeftoverWorkflows();
  });

  apiTest.afterAll(async ({ esClient, kbnClient }) => {
    await deleteAnsweredQueries(esClient);
    await deleteDispatchedActions(systemEs, takeDispatchedActionIds());
    // Deleting the space removes the prebuilt copies loaded in it.
    await deleteTestSpace(kbnClient, PREBUILT_SPACE);
    await deletePack(kbnClient, packId);
    await deletePack(kbnClient, placeholderPackId);
    await deleteFakeAgents(systemEs, [AGENT.id]);
    await deleteAgentPolicy(kbnClient, policyId);
    await deleteSystemIndicesUser(esClient);
  });

  apiTest(
    'partial when one pack query succeeds and the other fails, with max_rows per query',
    async ({ apiClient, esClient }) => {
      const workflows = workflowsClient(apiClient, adminHeaders);
      const workflowId = await workflows.create(
        'osq-wf-pack-partial',
        runPackStep(`pack: osq-wf-pack`, '      max_rows: 1')
      );
      const before = await findAgentActionIds(systemEs, AGENT.id);
      const executionId = await workflows.run(workflowId);
      const state = await workflows.waitForDispatch(executionId, 'p');

      // The disabled query `skip` is not dispatched.
      expect(state.queries.map((query) => query.query_id).sort()).toStrictEqual(['procs', 'users']);
      const actionIdOf = (queryId: string) =>
        state.queries.find((query) => query.query_id === queryId)!.action_id;

      await answerQuery(esClient, {
        queryActionId: actionIdOf('procs'),
        agent: AGENT,
        rows: [
          { pid: '1', name: 'systemd' },
          { pid: '2', name: 'kthreadd' },
        ],
        ecsMapping: { 'process.name': 'name' },
      });
      await answerQuery(esClient, {
        queryActionId: actionIdOf('users'),
        agent: AGENT,
        error: 'no such table: users',
      });

      const execution = await workflows.waitForEnd(executionId);
      const { output } = stepOf(execution, 'p');
      expect(execution.status).toBe('completed');
      expect(output).toMatchObject({ status: 'partial', action_id: state.action_id });
      expect(output?.error_code).toBeUndefined();
      const byId = Object.fromEntries(
        (output?.queries as Array<Record<string, any>>).map((query) => [query.query_id, query])
      );
      expect(Object.keys(byId).sort()).toStrictEqual(['procs', 'users']);
      expect(byId.procs).toMatchObject({
        status: 'success',
        action_id: actionIdOf('procs'),
        row_count: 2,
        truncated: true,
      });
      expect(byId.procs.rows).toHaveLength(1);
      expect(Object.keys(byId.procs.rows[0].ecs)).toStrictEqual(['process.name']);
      expect(byId.users).toMatchObject({ status: 'failed', rows: [], row_count: 0 });
      expect(byId.users.agents).toMatchObject({ total: 1, responded: 1, failed: 1 });

      // One POST creates one action, regardless of which tests ran the pack before this one.
      const after = await findAgentActionIds(systemEs, AGENT.id);
      expect(new Set([...after].filter((actionId) => !before.has(actionId)))).toStrictEqual(
        new Set([state.action_id])
      );
      const actions = await findPackActionDocs(systemEs, packId, state.action_id);
      expect(actions).toHaveLength(1);
      const [action] = actions;
      expect(action.action_id).toBe(state.action_id);
      expect(action.alert_ids).toBeUndefined();
      expect(action.queries.map((query: { id: string }) => query.id).sort()).toStrictEqual([
        'procs',
        'users',
      ]);
      await workflows.delete(workflowId);
    }
  );

  apiTest('success when every pack query succeeds', async ({ apiClient, esClient }) => {
    const workflows = workflowsClient(apiClient, adminHeaders);
    const workflowId = await workflows.create(
      'osq-wf-pack-success',
      runPackStep(`pack: osq-wf-pack`)
    );
    const executionId = await workflows.run(workflowId);
    const state = await workflows.waitForDispatch(executionId, 'p');
    for (const { action_id: queryActionId } of state.queries) {
      await answerQuery(esClient, {
        queryActionId,
        agent: AGENT,
        rows: [{ pid: '1', name: 'systemd', uid: '0' }],
      });
    }

    const { output } = stepOf(await workflows.waitForEnd(executionId), 'p');
    expect(output).toMatchObject({ status: 'success' });
    expect(output?.queries).toHaveLength(2);
    await workflows.delete(workflowId);
  });

  apiTest('timed_out: no agent answers any pack query by the deadline', async ({ apiClient }) => {
    const workflows = workflowsClient(apiClient, adminHeaders);
    const workflowId = await workflows.create(
      'osq-wf-pack-timed-out',
      runPackStep(`pack: osq-wf-pack`, '      wait_timeout: 15s')
    );
    const executionId = await workflows.run(workflowId);
    await workflows.waitForDispatch(executionId, 'p');

    const { output } = stepOf(await workflows.waitForEnd(executionId), 'p');
    expect(output?.status).toBe('timed_out');
    expect(
      (output?.queries as Array<{ status: string }>).map((query) => query.status)
    ).toStrictEqual(['timed_out', 'timed_out']);
    await workflows.delete(workflowId);
  });

  apiTest('failed: every pack query reports an error', async ({ apiClient, esClient }) => {
    const workflows = workflowsClient(apiClient, adminHeaders);
    const workflowId = await workflows.create(
      'osq-wf-pack-failed',
      runPackStep(`pack: osq-wf-pack`)
    );
    const executionId = await workflows.run(workflowId);
    const state = await workflows.waitForDispatch(executionId, 'p');
    for (const { action_id: queryActionId } of state.queries) {
      await answerQuery(esClient, { queryActionId, agent: AGENT, error: 'no such table' });
    }

    const { output } = stepOf(await workflows.waitForEnd(executionId), 'p');
    expect(output?.status).toBe('failed');
    await workflows.delete(workflowId);
  });

  apiTest(
    'a pack that sets both or neither of pack and prebuilt_pack is rejected when saved',
    async ({ apiClient }) => {
      const workflows = workflowsClient(apiClient, adminHeaders);
      for (const [name, pack] of [
        ['osq-wf-pack-both', `pack: osq-wf-pack\n      prebuilt_pack: ${PREBUILT_PACK}`],
        ['osq-wf-pack-neither', ''],
      ]) {
        // Bulk create still saves the workflow, flagged invalid and without the reason.
        const created = await workflows.save(name, runPackStep(pack));
        expect(created.valid).toBe(false);
        await workflows.delete(created.id);

        const validation = await workflows.validate(name, runPackStep(pack));
        expect(validation.valid).toBe(false);
        const errors = validation.diagnostics
          .filter((diagnostic) => diagnostic.severity === 'error')
          .map((diagnostic) => diagnostic.message);
        expect(errors.join('\n')).toMatch(/exactly one of pack or prebuilt_pack/i);
      }
    }
  );

  apiTest(
    'PACK_NOT_FOUND for an unknown pack name, before anything is dispatched',
    async ({ apiClient }) => {
      const workflows = workflowsClient(apiClient, adminHeaders);
      const workflowId = await workflows.create(
        'osq-wf-pack-not-found',
        runPackStep('pack: osq-wf-does-not-exist')
      );
      const before = await findAgentActionIds(systemEs, AGENT.id);
      const execution = await workflows.waitForEnd(await workflows.run(workflowId));

      expect(execution.status).toBe('failed');
      expect(stepOf(execution, 'p').error?.details?.code).toBe('PACK_NOT_FOUND');
      expect(await findAgentActionIds(systemEs, AGENT.id)).toStrictEqual(before);
      await workflows.delete(workflowId);
    }
  );

  apiTest(
    'PREBUILT_PACK_NOT_LOADED until prebuilt packs are loaded in the space',
    async ({ apiClient, kbnClient }) => {
      const workflows = workflowsClient(apiClient, adminHeaders, PREBUILT_SPACE);
      const workflowId = await workflows.create(
        'osq-wf-prebuilt',
        runPackStep(`prebuilt_pack: ${PREBUILT_PACK}`, '      wait_timeout: 10s')
      );

      const before = await workflows.waitForEnd(await workflows.run(workflowId));
      expect(before.status).toBe('failed');
      expect(stepOf(before, 'p').error?.details?.code).toBe('PREBUILT_PACK_NOT_LOADED');

      await loadPrebuiltPacks(kbnClient, PREBUILT_SPACE);

      const executionId = await workflows.run(workflowId);
      const state = await workflows.waitForDispatch(executionId, 'p');
      expect(state.queries.length).toBeGreaterThan(0);

      // No agent answers in this space, so every query of the prebuilt pack runs out its 10s wait.
      const { output } = stepOf(await workflows.waitForEnd(executionId), 'p');
      expect(output?.status).toBe('timed_out');
      expect(output?.error_code).toBeUndefined();
      const statuses = (output?.queries as Array<{ status: string }>).map(({ status }) => status);
      expect(statuses).toHaveLength(state.queries.length);
      expect(new Set(statuses)).toStrictEqual(new Set(['timed_out']));
      await workflows.delete(workflowId);
    }
  );

  apiTest(
    'a pack with {{…}} placeholders in an enabled query is rejected before anything is dispatched',
    async ({ apiClient }) => {
      const workflows = workflowsClient(apiClient, adminHeaders);
      const workflowId = await workflows.create(
        'osq-wf-pack-placeholder',
        runPackStep(`pack: osq-wf-pack-placeholder`)
      );
      const before = await findAgentActionIds(systemEs, AGENT.id);
      const execution = await workflows.waitForEnd(await workflows.run(workflowId));

      expect(execution.status).toBe('failed');
      expect(stepOf(execution, 'p').error?.details?.code).toBe('PACK_QUERY_HAS_PLACEHOLDERS');
      expect(await findAgentActionIds(systemEs, AGENT.id)).toStrictEqual(before);
      await workflows.delete(workflowId);
    }
  );

  apiTest(
    'MISSING_PRIVILEGE without packs read, before anything is dispatched',
    async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(
        osqueryRole(['minimal_read', 'live_queries_all', 'run_saved_queries'])
      );
      const workflows = workflowsClient(apiClient, apiKeyHeader);
      const workflowId = await workflows.create(
        'osq-wf-pack-no-packs-read',
        runPackStep(`pack: osq-wf-pack`)
      );
      const before = await findAgentActionIds(systemEs, AGENT.id);
      const execution = await workflows.waitForEnd(await workflows.run(workflowId));

      expect(execution.status).toBe('failed');
      expect(stepOf(execution, 'p').error?.details?.code).toBe('MISSING_PRIVILEGE');
      expect(await findAgentActionIds(systemEs, AGENT.id)).toStrictEqual(before);
      await workflows.delete(workflowId);
    }
  );

  apiTest(
    'MISSING_PRIVILEGE without live_queries_read, before anything is dispatched',
    async ({ apiClient, requestAuth }) => {
      // Like osquery.runQuery, the step checks that it can read the results back before it
      // dispatches: STATUS_UNREADABLE_FORBIDDEN is only reachable when the privilege is lost
      // between the dispatch and a poll, which the unit tests cover.
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(
        osqueryRole(['minimal_read', 'run_saved_queries', 'packs_read'])
      );
      const workflows = workflowsClient(apiClient, apiKeyHeader);
      const workflowId = await workflows.create(
        'osq-wf-pack-no-read',
        runPackStep(`pack: osq-wf-pack`)
      );
      const before = await findAgentActionIds(systemEs, AGENT.id);
      const execution = await workflows.waitForEnd(await workflows.run(workflowId));

      expect(execution.status).toBe('failed');
      expect(stepOf(execution, 'p').error?.details?.code).toBe('MISSING_PRIVILEGE');
      expect(stepOf(execution, 'p').error?.message).toMatch(/live_queries_read/);
      expect(await findAgentActionIds(systemEs, AGENT.id)).toStrictEqual(before);
      await workflows.delete(workflowId);
    }
  );

  apiTest(
    'MISSING_PRIVILEGE without either run_saved_queries or live_queries_all, before anything is dispatched',
    async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(
        osqueryRole(['minimal_read', 'packs_read', 'live_queries_read'])
      );
      const workflows = workflowsClient(apiClient, apiKeyHeader);
      const workflowId = await workflows.create(
        'osq-wf-pack-no-run',
        runPackStep(`pack: osq-wf-pack`)
      );
      const before = await findAgentActionIds(systemEs, AGENT.id);
      const execution = await workflows.waitForEnd(await workflows.run(workflowId));

      expect(execution.status).toBe('failed');
      const { error } = stepOf(execution, 'p');
      expect(error?.details?.code).toBe('MISSING_PRIVILEGE');
      expect(error?.message).toMatch(/Live query rejected \(HTTP 403\)/);
      expect(await findAgentActionIds(systemEs, AGENT.id)).toStrictEqual(before);
      await workflows.delete(workflowId);
    }
  );
});
