/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import {
  createGenAiConnectorForProxy,
  deleteConnectorById,
} from '../../../../scout_agent_builder_shared/lib/connector_kbn';
import { setupAgentDirectAnswer } from '../../../../scout_agent_builder_shared/lib/proxy_scenario';
import { deleteConversationsByIds } from '../../../../scout_agent_builder_shared/lib/conversations_es';
import { uniqueServiceAccountName } from '../../../../scout_agent_builder_shared/lib/service_accounts_es';
import {
  apiTest,
  API_AGENT_BUILDER,
  COMMON_HEADERS,
  ELASTIC_API_VERSION,
  getConversation,
  postConverse,
} from '../fixtures';

// Bindings need user-managed Elasticsearch service accounts, which serverless (UIAM) does not offer.
const STATEFUL_ONLY = tags.stateful.classic;

const AGENT_PATH = (id: string) => `${API_AGENT_BUILDER}/agents/${encodeURIComponent(id)}`;
const SERVICE_ACCOUNTS_PATH = '/internal/security/service_account';
// Binding has no public API; the Scout test plugin exposes the agent registry call on this route.
const BIND_TEST_PATH = (id: string) =>
  `/internal/agent_builder_test/agents/${encodeURIComponent(id)}/service_account`;
const WORKFLOW_PATH = (id: string) => `/api/workflows/workflow/${encodeURIComponent(id)}`;
// The hook's pause, its resume task, and the agent round, with room for a slow CI node.
const ROUND_WITH_PAUSED_HOOK_TIMEOUT = 120_000;

/**
 * Regression for elastic/kibana#302095: a bound agent runs in a Task Manager task as its service
 * account, so its hooks start workflows with that account's request. A hook workflow that has to
 * pause schedules a task of its own, which must not try to clone the account's credential.
 */
apiTest.describe(
  'Agent Builder — hooks of an agent bound to a service account',
  { tag: STATEFUL_ONLY },
  () => {
    const runId = randomUUID();
    const agentId = `bound-hook-agent-${runId}`;
    const hookWorkflowId = `bound-hook-${runId}`;
    const serviceAccountRole = `bound-hook-service-account-role-${runId}`;

    let admin: RoleApiCredentials;
    let adminCookieHeader: Record<string, string>;
    let serviceAccountId: string;
    let llmProxy: LlmProxy;
    let connectorId: string;
    const conversationIds: string[] = [];

    const adminHeaders = () => ({
      ...COMMON_HEADERS,
      ...admin.apiKeyHeader,
      'elastic-api-version': ELASTIC_API_VERSION,
    });

    // A wait of 5s or more is persisted and resumed by a task instead of sleeping in memory.
    const hookYaml = (accountId: string) => `name: Bound hook ${runId}
enabled: true
settings:
  run_as: ${accountId}
triggers:
  - type: manual
steps:
  - name: pause
    type: wait
    with:
      duration: 6s
  - name: authenticate
    type: elasticsearch.request
    with:
      method: GET
      path: /_security/_authenticate
`;

    apiTest.beforeAll(async ({ apiClient, kbnClient, requestAuth, samlAuth, log }) => {
      admin = await requestAuth.getApiKeyForAdmin();
      ({ cookieHeader: adminCookieHeader } = await samlAuth.asInteractiveUser('admin'));
      llmProxy = await createLlmProxy(log);
      ({ id: connectorId } = await createGenAiConnectorForProxy(kbnClient, llmProxy));

      await kbnClient.request({
        method: 'PUT',
        path: `/api/security/role/${serviceAccountRole}`,
        headers: { 'elastic-api-version': ELASTIC_API_VERSION },
        body: {
          elasticsearch: { cluster: [], indices: [] },
          kibana: [
            {
              base: [],
              feature: { agentBuilder: ['all'], workflowsManagement: ['all'], actions: ['read'] },
              spaces: ['*'],
            },
          ],
        },
      });
      // Created through Kibana, which keeps the credential Core exchanges for a run-time token.
      const { data: account } = await kbnClient.request<{ id: string }>({
        method: 'POST',
        path: SERVICE_ACCOUNTS_PATH,
        headers: { ...COMMON_HEADERS, ...adminCookieHeader },
        body: { name: uniqueServiceAccountName('bound-hook'), roles: [serviceAccountRole] },
      });
      serviceAccountId = account.id;

      const workflow = await apiClient.post('/api/workflows/workflow', {
        headers: adminHeaders(),
        body: { id: hookWorkflowId, yaml: hookYaml(serviceAccountId) },
        responseType: 'json',
      });
      expect(workflow, JSON.stringify(workflow.body)).toHaveStatusCode(200);

      const agent = await apiClient.post(`${API_AGENT_BUILDER}/agents`, {
        headers: adminHeaders(),
        body: {
          id: agentId,
          name: 'Bound agent with a hook',
          description: 'Runs a before-agent workflow as its service account',
          configuration: {
            instructions: 'Answer briefly.',
            tools: [],
            workflow_ids: [hookWorkflowId],
          },
        },
        responseType: 'json',
      });
      expect(agent, JSON.stringify(agent.body)).toHaveStatusCode(200);

      const bound = await apiClient.put(BIND_TEST_PATH(agentId), {
        headers: adminHeaders(),
        body: { service_account_id: serviceAccountId },
        responseType: 'json',
      });
      expect(bound, JSON.stringify(bound.body)).toHaveStatusCode(200);
    });

    apiTest.afterAll(async ({ apiClient, kbnClient }) => {
      llmProxy.close();
      await apiClient.delete(AGENT_PATH(agentId), {
        headers: adminHeaders(),
        responseType: 'json',
      });
      await apiClient.post(`${WORKFLOW_PATH(hookWorkflowId)}/executions/cancel`, {
        headers: adminHeaders(),
        responseType: 'json',
      });
      await apiClient.delete(
        `${WORKFLOW_PATH(hookWorkflowId)}?force=true&acknowledgeAclLoss=true`,
        {
          headers: adminHeaders(),
          responseType: 'json',
        }
      );
      await deleteConnectorById(kbnClient, connectorId);
      await deleteConversationsByIds(kbnClient, conversationIds);
      if (serviceAccountId) {
        await kbnClient.request({
          method: 'DELETE',
          path: `${SERVICE_ACCOUNTS_PATH}/${encodeURIComponent(serviceAccountId)}?force=true`,
          headers: { ...COMMON_HEADERS, ...adminCookieHeader },
          ignoreErrors: [404],
        });
      }
      await kbnClient.request({
        method: 'DELETE',
        path: `/api/security/role/${serviceAccountRole}`,
        headers: { 'elastic-api-version': ELASTIC_API_VERSION },
        ignoreErrors: [404],
      });
    });

    apiTest(
      'completes the round after a bound hook workflow pauses and resumes as the account',
      async ({ apiClient }) => {
        apiTest.setTimeout(ROUND_WITH_PAUSED_HOOK_TIMEOUT);
        await setupAgentDirectAnswer({ proxy: llmProxy, response: 'hook done' });

        const res = await postConverse(
          apiClient,
          admin.apiKeyHeader,
          { agent_id: agentId, input: 'hello', connector_id: connectorId },
          'task_manager'
        );

        expect(res, JSON.stringify(res.body)).toHaveStatusCode(200);
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
        const { conversation_id: conversationId } = res.body as { conversation_id: string };
        conversationIds.push(conversationId);

        const conversation = await getConversation(apiClient, admin.apiKeyHeader, conversationId);
        expect(conversation.rounds[0].response.message).toBe('hook done');

        const executions = await apiClient.get(`${WORKFLOW_PATH(hookWorkflowId)}/executions`, {
          headers: adminHeaders(),
          responseType: 'json',
        });
        expect(executions).toHaveStatusCode(200);
        const [{ id: executionId }] = (executions.body as { results: WorkflowExecutionDto[] })
          .results;
        const execution = await apiClient.get(
          `/api/workflows/executions/${executionId}?includeOutput=true`,
          { headers: adminHeaders(), responseType: 'json' }
        );
        expect(execution).toHaveStatusCode(200);
        const hookRun = execution.body as WorkflowExecutionDto;
        expect(hookRun.status).toBe('completed');
        expect(hookRun.effectiveIdentity).toMatchObject({
          type: 'service_account',
          id: serviceAccountId,
        });
        const authenticate = hookRun.stepExecutions?.find(
          ({ stepId }) => stepId === 'authenticate'
        );
        expect(authenticate?.status).toBe('completed');
        expect(JSON.stringify(authenticate?.output)).toContain(serviceAccountId);
      }
    );
  }
);
