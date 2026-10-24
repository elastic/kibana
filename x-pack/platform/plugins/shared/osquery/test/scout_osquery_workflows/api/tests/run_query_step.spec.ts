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
  createSavedQuery,
  createSystemIndicesClient,
  deleteAgentPolicy,
  deleteFakeAgents,
  deleteSavedQuery,
  indexFakeAgents,
  stepOf,
  workflowsClient,
  type FakeAgent,
} from '../fixtures';

const AGENT_A: FakeAgent = { id: 'osq-wf-rq-agent-a', hostname: 'rq-host-a', platform: 'ubuntu' };
const AGENT_B: FakeAgent = { id: 'osq-wf-rq-agent-b', hostname: 'rq-host-b', platform: 'ubuntu' };
const DARWIN_AGENT: FakeAgent = {
  id: 'osq-wf-rq-agent-mac',
  hostname: 'rq-mac',
  platform: 'darwin',
};
const DISTROS = [
  'debian',
  'centos',
  'rhel',
  'amzn',
  'rocky',
  'almalinux',
  'sles',
  'opensuse-leap',
  'fedora',
  'oracle',
  'arch',
  'alpine',
];
const SAVED_QUERY = 'osq_wf_rq_processes';
const OTHER_SPACE = 'osq-wf-other';
const OTHER_SPACE_QUERY = 'osq_wf_rq_other_space_only';

const runQueryStep = (target: string, extra = '') => `  - name: q
    type: osquery.runQuery
    with:
      saved_query: ${SAVED_QUERY}
      ${target}
${extra}`;

const osqueryRole = (osquery: string[]): KibanaRole => ({
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { osquery, workflowsManagement: ['all'] }, spaces: ['*'] }],
});

apiTest.describe('osquery.runQuery workflow step', { tag: ['@local-stateful-classic'] }, () => {
  let systemEs: Client;
  let policyId: string;
  let adminHeaders: Record<string, string>;
  const savedQueryIds: Array<{ id: string; space?: string }> = [];

  apiTest.beforeAll(async ({ esClient, kbnClient, config, requestAuth }) => {
    systemEs = await createSystemIndicesClient(esClient, config);
    policyId = await createOsqueryAgentPolicy(kbnClient, 'osq-wf-run-query');
    await indexFakeAgents(systemEs, policyId, [AGENT_A, AGENT_B]);
    savedQueryIds.push({
      id: await createSavedQuery(kbnClient, {
        id: SAVED_QUERY,
        query: 'SELECT pid, name FROM processes',
        ecs_mapping: { 'process.name': { field: 'name' } },
      }),
    });
    await kbnClient.request({
      method: 'POST',
      path: '/api/spaces/space',
      body: { id: OTHER_SPACE, name: OTHER_SPACE },
      ignoreErrors: [409],
    });
    savedQueryIds.push({
      id: await createSavedQuery(
        kbnClient,
        { id: OTHER_SPACE_QUERY, query: 'SELECT 1' },
        OTHER_SPACE
      ),
      space: OTHER_SPACE,
    });
    ({ apiKeyHeader: adminHeaders } = await requestAuth.getApiKeyForAdmin());
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    for (const { id, space } of savedQueryIds) {
      await deleteSavedQuery(kbnClient, id, space);
    }

    await kbnClient.request({
      method: 'DELETE',
      path: `/api/spaces/space/${OTHER_SPACE}`,
      ignoreErrors: [404],
    });
    await deleteFakeAgents(systemEs, [AGENT_A.id, AGENT_B.id]);
    await deleteAgentPolicy(kbnClient, policyId);
  });

  apiTest(
    'success: rows carry the host, string columns and only the mapped ECS fields',
    async ({ apiClient, esClient }) => {
      const workflows = workflowsClient(apiClient, adminHeaders);
      const workflowId = await workflows.create(
        'osq-wf-success',
        runQueryStep(`agent_ids: ["${AGENT_A.id}"]`)
      );
      const executionId = await workflows.run(workflowId);
      const state = await workflows.waitForDispatch(executionId, 'q');

      await answerQuery(esClient, {
        queryActionId: state.queries[0].action_id,
        agent: AGENT_A,
        rows: [
          { pid: '1', name: 'systemd' },
          { pid: '42', name: 'sshd' },
        ],
        ecsMapping: { 'process.name': 'name' },
      });

      const execution = await workflows.waitForEnd(executionId);
      const { output } = stepOf(execution, 'q');
      expect(execution.status).toBe('completed');
      expect(output).toMatchObject({
        status: 'success',
        action_id: state.action_id,
        agents: { total: 1, responded: 1, pending: 0, failed: 0 },
        row_count: 2,
        truncated: false,
      });
      expect(output?.rows).toHaveLength(2);
      expect(output?.rows[0]).toMatchObject({
        agent: { id: AGENT_A.id, name: AGENT_A.hostname },
        // Scout's `expect` has no `any`; `stringContaining('')` still requires a string.
        columns: { pid: expect.stringContaining(''), name: expect.stringContaining('') },
      });
      expect(Object.keys(output?.rows[0].ecs)).toStrictEqual(['process.name']);
      await workflows.delete(workflowId);
    }
  );

  apiTest(
    'partial: one of two agents answers before the deadline',
    async ({ apiClient, esClient }) => {
      const workflows = workflowsClient(apiClient, adminHeaders);
      const workflowId = await workflows.create(
        'osq-wf-partial',
        runQueryStep(`agent_ids: ["${AGENT_A.id}", "${AGENT_B.id}"]`, '      wait_timeout: 20s')
      );
      const executionId = await workflows.run(workflowId);
      const state = await workflows.waitForDispatch(executionId, 'q');
      await answerQuery(esClient, {
        queryActionId: state.queries[0].action_id,
        agent: AGENT_A,
        rows: [{ pid: '1', name: 'systemd' }],
      });

      const { output } = stepOf(await workflows.waitForEnd(executionId), 'q');
      expect(output).toMatchObject({
        status: 'partial',
        agents: { total: 2, responded: 1, pending: 1 },
        row_count: 1,
      });
      await workflows.delete(workflowId);
    }
  );

  apiTest('failed: the only agent reports a query error', async ({ apiClient, esClient }) => {
    const workflows = workflowsClient(apiClient, adminHeaders);
    const workflowId = await workflows.create(
      'osq-wf-failed',
      runQueryStep(`agent_ids: ["${AGENT_A.id}"]`)
    );
    const executionId = await workflows.run(workflowId);
    const state = await workflows.waitForDispatch(executionId, 'q');
    await answerQuery(esClient, {
      queryActionId: state.queries[0].action_id,
      agent: AGENT_A,
      error: 'no such table: processes',
    });

    const { output } = stepOf(await workflows.waitForEnd(executionId), 'q');
    expect(output).toMatchObject({
      status: 'failed',
      agents: { total: 1, responded: 1, failed: 1 },
      rows: [],
    });
    await workflows.delete(workflowId);
  });

  apiTest('timed_out: no agent answers by the deadline', async ({ apiClient }) => {
    const workflows = workflowsClient(apiClient, adminHeaders);
    const workflowId = await workflows.create(
      'osq-wf-timed-out',
      runQueryStep(`agent_ids: ["${AGENT_B.id}"]`, '      wait_timeout: 15s')
    );
    const executionId = await workflows.run(workflowId);

    const { output } = stepOf(await workflows.waitForEnd(executionId), 'q');
    expect(output).toMatchObject({
      status: 'timed_out',
      agents: { total: 1, responded: 0, pending: 1 },
    });
    await workflows.delete(workflowId);
  });

  apiTest(
    'linux targets every Linux distribution of the online osquery agents',
    async ({ apiClient, kbnClient }) => {
      // More distinct platform values than the default terms aggregation size (10).
      const distroAgents: FakeAgent[] = DISTROS.map((platform) => ({
        id: `osq-wf-rq-distro-${platform}`,
        hostname: `rq-${platform}`,
        platform,
      }));
      await indexFakeAgents(systemEs, policyId, [...distroAgents, DARWIN_AGENT]);

      try {
        const workflows = workflowsClient(apiClient, adminHeaders);
        const workflowId = await workflows.create(
          'osq-wf-linux',
          runQueryStep('agent_platforms: ["linux"]', '      wait_timeout: 10s')
        );
        const executionId = await workflows.run(workflowId);
        const state = await workflows.waitForDispatch(executionId, 'q');

        const { data: details } = await kbnClient.request<{ data: { agents: string[] } }>({
          method: 'GET',
          path: `/api/osquery/live_queries/${state.action_id}`,
          headers: { 'elastic-api-version': '2023-10-31' },
        });
        expect(details.data.agents).toStrictEqual(
          expect.arrayContaining([AGENT_A.id, AGENT_B.id, ...distroAgents.map(({ id }) => id)])
        );
        expect(details.data.agents).not.toContain(DARWIN_AGENT.id);

        await workflows.waitForEnd(executionId);
        await workflows.delete(workflowId);
      } finally {
        await deleteFakeAgents(
          systemEs,
          [...distroAgents, DARWIN_AGENT].map(({ id }) => id)
        );
      }
    }
  );

  apiTest(
    'SAVED_QUERY_NOT_FOUND for a saved query that exists only in another space',
    async ({ apiClient }) => {
      const workflows = workflowsClient(apiClient, adminHeaders);
      const workflowId = await workflows.create(
        'osq-wf-other-space',
        `  - name: q
    type: osquery.runQuery
    with:
      saved_query: ${OTHER_SPACE_QUERY}
      agent_ids: ["${AGENT_A.id}"]
`
      );
      const execution = await workflows.waitForEnd(await workflows.run(workflowId));

      expect(execution.status).toBe('failed');
      expect(stepOf(execution, 'q').error?.details?.code).toBe('SAVED_QUERY_NOT_FOUND');
      await workflows.delete(workflowId);
    }
  );

  apiTest(
    'MISSING_PRIVILEGE without run_saved_queries, before anything is dispatched',
    async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(
        osqueryRole(['minimal_read', 'saved_queries_read', 'live_queries_read'])
      );
      const workflows = workflowsClient(apiClient, apiKeyHeader);
      const workflowId = await workflows.create(
        'osq-wf-no-run',
        runQueryStep(`agent_ids: ["${AGENT_A.id}"]`)
      );
      const execution = await workflows.waitForEnd(await workflows.run(workflowId));

      expect(execution.status).toBe('failed');
      expect(stepOf(execution, 'q').error?.details?.code).toBe('MISSING_PRIVILEGE');
      await workflows.delete(workflowId);
    }
  );

  apiTest(
    'STATUS_UNREADABLE_FORBIDDEN without live_queries_read, right after dispatch',
    async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(
        osqueryRole(['minimal_read', 'run_saved_queries', 'saved_queries_read'])
      );
      const workflows = workflowsClient(apiClient, apiKeyHeader);
      const workflowId = await workflows.create(
        'osq-wf-no-read',
        runQueryStep(`agent_ids: ["${AGENT_A.id}"]`)
      );
      const execution = await workflows.waitForEnd(await workflows.run(workflowId), 60_000);

      expect(execution.status).toBe('completed');
      expect(stepOf(execution, 'q').output).toMatchObject({
        status: 'failed',
        error_code: 'STATUS_UNREADABLE_FORBIDDEN',
        action_id: expect.stringContaining(''),
      });
      await workflows.delete(workflowId);
    }
  );
});
