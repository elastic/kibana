/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { PolicyExecutionHistoryItem } from '@kbn/alerting-v2-schemas';
import type { WorkflowExecutionDto } from '@kbn/workflows';

apiTest.describe('Action policy workflow access', { tag: tags.stateful.classic }, () => {
  const spaceId = `policy-acl-${randomUUID()}`;
  const usernames = [`owner-${randomUUID()}`, `other-${randomUUID()}`];
  const credentials: Array<Record<string, string>> = [];
  const policyIds: string[] = [];
  const ruleIds: string[] = [];
  const workflowIds: string[] = [];
  const path = (suffix: string) => `s/${spaceId}${suffix}`;

  apiTest.beforeAll(async ({ kbnClient, esClient }) => {
    await kbnClient.request({
      method: 'POST',
      path: '/api/spaces/space',
      body: { id: spaceId, name: spaceId },
    });
    for (const username of usernames) {
      const password = randomUUID();
      await esClient.security.putUser({ username, password, roles: ['superuser'] });
      credentials.push({
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
        'kbn-xsrf': 'scout',
        'x-elastic-internal-origin': 'kibana',
        'elastic-api-version': '2023-10-31',
      });
    }
  });

  apiTest.afterAll(async ({ apiClient, kbnClient, esClient }) => {
    for (const id of ruleIds) {
      await apiClient.delete(path(`/api/alerting/v2/rules/${id}`), { headers: credentials[0] });
    }
    for (const id of policyIds) {
      await apiClient.delete(path(`/api/alerting/v2/action_policies/${id}`), {
        headers: credentials[0],
      });
    }
    for (const id of workflowIds) {
      expect(
        await apiClient.delete(
          path(`/api/workflows/workflow/${id}?force=true&acknowledgeAclLoss=true`),
          { headers: credentials[0] }
        )
      ).toHaveStatusCode(200);
    }
    await kbnClient.request({ method: 'DELETE', path: `/api/spaces/space/${spaceId}` });
    for (const username of usernames) {
      await esClient.security.deleteUser({ username });
    }
  });

  for (const accessMode of ['public', 'private'] as const) {
    apiTest(
      `dispatches ${accessMode} workflows under each policy's own API key`,
      async ({ apiClient }) => {
        apiTest.setTimeout(180_000);
        const headers = credentials[0];
        const workflow = await apiClient.post(path('/api/workflows/workflow'), {
          headers,
          body: {
            yaml: `name: Policy ACL ${accessMode}
enabled: true
triggers:
  - type: manual
steps:
  - name: marker
    type: console
    with:
      message: policy access test
`,
          },
        });
        expect(workflow).toHaveStatusCode(200);
        const workflowId: string = workflow.body.id;
        workflowIds.push(workflowId);
        expect(
          await apiClient.put(path(`/internal/workflows/${workflowId}/access_control`), {
            headers,
            body: { access_mode: accessMode, entries: [] },
          })
        ).toHaveStatusCode(200);

        const currentPolicyIds: string[] = [];
        for (const policyHeaders of credentials) {
          const policy = await apiClient.post(path('/api/alerting/v2/action_policies'), {
            headers: policyHeaders,
            body: {
              name: `Policy ACL ${accessMode}`,
              description: 'Checks workflow access under the policy API key',
              destinations: [{ type: 'workflow', id: workflowId }],
              matcher: { expression: `rule.tags: "${workflowId}"` },
              grouping_mode: 'per_episode',
              throttle: { strategy: 'every_time' },
            },
          });
          expect(policy).toHaveStatusCode(201);
          policyIds.push(policy.body.id);
          currentPolicyIds.push(policy.body.id);
        }
        const rule = await apiClient.post(path('/api/alerting/v2/rules'), {
          headers,
          body: {
            kind: 'alert',
            metadata: { name: `Policy ACL ${accessMode}`, tags: [workflowId] },
            time_field: 'qa_timestamp',
            schedule: { every: '1d', lookback: '5m' },
            query: { format: 'standalone', breach: { query: 'ROW qa_timestamp = NOW()' } },
            state_transition: { pending_count: 0 },
            recovery_strategy: 'none',
          },
        });
        expect(rule).toHaveStatusCode(201);
        ruleIds.push(rule.body.id);
        expect(
          await apiClient.post(path(`/api/alerting/v2/rules/${rule.body.id}/_run`), { headers })
        ).toHaveStatusCode(204);

        await expect
          .poll(
            async () => {
              const history = await apiClient.get(
                path('/api/alerting/v2/execution_history/action_policies'),
                { headers }
              );
              expect(history).toHaveStatusCode(200);
              const items: PolicyExecutionHistoryItem[] = history.body.items;
              return currentPolicyIds.map(
                (id) => items.find((item) => item.policy.id === id)?.outcome
              );
            },
            { timeout: 120_000 }
          )
          .toStrictEqual([
            'dispatched',
            accessMode === 'private' ? 'dispatch_failed' : 'dispatched',
          ]);

        await expect
          .poll(
            async () => {
              const executions = await apiClient.get(
                path(`/api/workflows/workflow/${workflowId}/executions`),
                { headers }
              );
              expect(executions).toHaveStatusCode(200);
              const results: WorkflowExecutionDto[] = executions.body.results;
              expect(
                results.every(
                  ({ executedBy }) => accessMode === 'public' || executedBy === usernames[0]
                )
              ).toBe(true);
              return [
                ...new Set(
                  results
                    .filter(({ status }) => status === 'completed')
                    .map(({ executedBy }) => executedBy)
                ),
              ].sort();
            },
            { timeout: 60_000 }
          )
          .toStrictEqual((accessMode === 'private' ? [usernames[0]] : usernames).toSorted());
      }
    );
  }
});
