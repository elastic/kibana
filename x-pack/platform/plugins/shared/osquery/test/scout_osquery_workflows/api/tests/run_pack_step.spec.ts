/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { expect } from '@kbn/scout/api';
import {
  answerQuery,
  apiTest,
  createOsqueryAgentPolicy,
  createPack,
  createSystemIndicesClient,
  deleteAgentPolicy,
  deleteFakeAgents,
  deletePack,
  indexFakeAgents,
  stepOf,
  workflowsClient,
  type FakeAgent,
} from '../fixtures';

const AGENT: FakeAgent = { id: 'osq-wf-rp-agent', hostname: 'rp-host', platform: 'ubuntu' };

apiTest.describe('osquery.runPack workflow step', { tag: ['@local-stateful-classic'] }, () => {
  let systemEs: Client;
  let policyId: string;
  let packId: string;
  let adminHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ esClient, kbnClient, config, requestAuth }) => {
    systemEs = await createSystemIndicesClient(esClient, config);
    policyId = await createOsqueryAgentPolicy(kbnClient, 'osq-wf-run-pack');
    await indexFakeAgents(systemEs, policyId, [AGENT]);
    packId = await createPack(kbnClient, 'osq-wf-pack', {
      procs: { query: 'SELECT pid, name FROM processes', interval: 3600 },
      users: { query: 'SELECT uid FROM users', interval: 3600 },
    });
    ({ apiKeyHeader: adminHeaders } = await requestAuth.getApiKeyForAdmin());
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await deletePack(kbnClient, packId);
    await deleteFakeAgents(systemEs, [AGENT.id]);
    await deleteAgentPolicy(kbnClient, policyId);
  });

  apiTest(
    'partial when one pack query succeeds and the other fails',
    async ({ apiClient, esClient }) => {
      const workflows = workflowsClient(apiClient, adminHeaders);
      const workflowId = await workflows.create(
        'osq-wf-pack-partial',
        `  - name: p
    type: osquery.runPack
    with:
      pack_id: ${packId}
      agent_ids: ["${AGENT.id}"]
      max_rows: 1
`
      );
      const executionId = await workflows.run(workflowId);
      const state = await workflows.waitForDispatch(executionId, 'p');
      const actionIdOf = (queryId: string) =>
        state.queries.find((query) => query.query_id === queryId)!.action_id;

      await answerQuery(esClient, {
        queryActionId: actionIdOf('procs'),
        agent: AGENT,
        rows: [
          { pid: '1', name: 'systemd' },
          { pid: '2', name: 'kthreadd' },
        ],
      });
      await answerQuery(esClient, {
        queryActionId: actionIdOf('users'),
        agent: AGENT,
        error: 'no such table: users',
      });

      const { output } = stepOf(await workflows.waitForEnd(executionId), 'p');
      expect(output?.status).toBe('partial');
      const byId = Object.fromEntries(
        (output?.queries as Array<Record<string, any>>).map((query) => [query.query_id, query])
      );
      expect(byId.procs).toMatchObject({ status: 'success', row_count: 2, truncated: true });
      expect(byId.procs.rows).toHaveLength(1);
      expect(byId.users).toMatchObject({ status: 'failed', rows: [] });
      await workflows.delete(workflowId);
    }
  );

  apiTest(
    'PREBUILT_PACK_NOT_LOADED until prebuilt packs are loaded in the space',
    async ({ apiClient, kbnClient }) => {
      const workflows = workflowsClient(apiClient, adminHeaders);
      const workflowId = await workflows.create(
        'osq-wf-prebuilt',
        `  - name: p
    type: osquery.runPack
    with:
      prebuilt_pack: forensic-persistence
      agent_ids: ["${AGENT.id}"]
      wait_timeout: 10s
`
      );

      const before = await workflows.waitForEnd(await workflows.run(workflowId));
      expect(before.status).toBe('failed');
      expect(stepOf(before, 'p').error?.details?.code).toBe('PREBUILT_PACK_NOT_LOADED');

      await kbnClient.request({
        method: 'POST',
        path: '/internal/osquery/assets/update',
        headers: { 'elastic-api-version': '1', 'x-elastic-internal-origin': 'kibana' },
      });

      const executionId = await workflows.run(workflowId);
      const state = await workflows.waitForDispatch(executionId, 'p');
      expect(state.queries.length).toBeGreaterThan(0);
      await workflows.waitForEnd(executionId);
      await workflows.delete(workflowId);
    }
  );
});
