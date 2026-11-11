/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { ApiClientFixture, RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import { TerminalExecutionStatuses, type WorkflowExecutionDto } from '@kbn/workflows';
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
    const approvalAgentId = `bound-approval-hook-agent-${runId}`;
    const approvalWorkflowId = `bound-approval-hook-${runId}`;
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

    // A hook returns once its workflow waits for input, so the round finishes before the approval.
    const approvalYaml = (accountId: string) => `name: Bound approval hook ${runId}
enabled: true
settings:
  run_as: ${accountId}
triggers:
  - type: manual
steps:
  - name: approval
    type: waitForInput
    with:
      message: Approve?
      schema:
        type: object
        properties:
          approved:
            type: boolean
        required:
          - approved
  - name: authenticate
    type: elasticsearch.request
    with:
      method: GET
      path: /_security/_authenticate
`;

    const createBoundAgent = async (
      apiClient: ApiClientFixture,
      { id, workflowId, yaml }: { id: string; workflowId: string; yaml: string }
    ) => {
      const workflow = await apiClient.post('/api/workflows/workflow', {
        headers: adminHeaders(),
        body: { id: workflowId, yaml },
        responseType: 'json',
      });
      expect(workflow, JSON.stringify(workflow.body)).toHaveStatusCode(200);

      const agent = await apiClient.post(`${API_AGENT_BUILDER}/agents`, {
        headers: adminHeaders(),
        body: {
          id,
          name: 'Bound agent with a hook',
          description: 'Runs a before-agent workflow as its service account',
          configuration: {
            instructions: 'Answer briefly.',
            tools: [],
            workflow_ids: [workflowId],
          },
        },
        responseType: 'json',
      });
      expect(agent, JSON.stringify(agent.body)).toHaveStatusCode(200);

      const bound = await apiClient.put(BIND_TEST_PATH(id), {
        headers: adminHeaders(),
        body: { service_account_id: serviceAccountId },
        responseType: 'json',
      });
      expect(bound, JSON.stringify(bound.body)).toHaveStatusCode(200);
    };

    const deleteBoundAgent = async (
      apiClient: ApiClientFixture,
      { id, workflowId }: { id: string; workflowId: string }
    ) => {
      await apiClient.delete(AGENT_PATH(id), { headers: adminHeaders(), responseType: 'json' });
      await apiClient.post(`${WORKFLOW_PATH(workflowId)}/executions/cancel`, {
        headers: adminHeaders(),
        responseType: 'json',
      });
      await apiClient.delete(`${WORKFLOW_PATH(workflowId)}?force=true&acknowledgeAclLoss=true`, {
        headers: adminHeaders(),
        responseType: 'json',
      });
    };

    const converse = async (apiClient: ApiClientFixture, id: string, response: string) => {
      await setupAgentDirectAnswer({ proxy: llmProxy, response });
      const res = await postConverse(
        apiClient,
        admin.apiKeyHeader,
        { agent_id: id, input: 'hello', connector_id: connectorId },
        'task_manager'
      );
      expect(res, JSON.stringify(res.body)).toHaveStatusCode(200);
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
      const { conversation_id: conversationId } = res.body as { conversation_id: string };
      conversationIds.push(conversationId);
      const conversation = await getConversation(apiClient, admin.apiKeyHeader, conversationId);
      expect(conversation.rounds[0].response.message).toBe(response);
    };

    const getOnlyExecution = async (apiClient: ApiClientFixture, workflowId: string) => {
      const executions = await apiClient.get(`${WORKFLOW_PATH(workflowId)}/executions`, {
        headers: adminHeaders(),
        responseType: 'json',
      });
      expect(executions).toHaveStatusCode(200);
      const [{ id: executionId }] = (executions.body as { results: WorkflowExecutionDto[] })
        .results;
      return getExecution(apiClient, executionId);
    };

    const getExecution = async (apiClient: ApiClientFixture, executionId: string) => {
      const execution = await apiClient.get(
        `/api/workflows/executions/${executionId}?includeOutput=true`,
        { headers: adminHeaders(), responseType: 'json' }
      );
      expect(execution).toHaveStatusCode(200);
      return execution.body as WorkflowExecutionDto;
    };

    const expectRanAsServiceAccount = (execution: WorkflowExecutionDto) => {
      expect(execution.effectiveIdentity).toMatchObject({
        type: 'service_account',
        id: serviceAccountId,
      });
      const authenticate = execution.stepExecutions?.find(
        ({ stepId }) => stepId === 'authenticate'
      );
      expect(authenticate?.status).toBe('completed');
      expect(JSON.stringify(authenticate?.output)).toContain(serviceAccountId);
    };

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

      await createBoundAgent(apiClient, {
        id: agentId,
        workflowId: hookWorkflowId,
        yaml: hookYaml(serviceAccountId),
      });
      await createBoundAgent(apiClient, {
        id: approvalAgentId,
        workflowId: approvalWorkflowId,
        yaml: approvalYaml(serviceAccountId),
      });
    });

    apiTest.afterAll(async ({ apiClient, kbnClient }) => {
      llmProxy.close();
      await deleteBoundAgent(apiClient, { id: agentId, workflowId: hookWorkflowId });
      await deleteBoundAgent(apiClient, { id: approvalAgentId, workflowId: approvalWorkflowId });
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
        await converse(apiClient, agentId, 'hook done');

        const hookRun = await getOnlyExecution(apiClient, hookWorkflowId);
        expect(hookRun.status).toBe('completed');
        expectRanAsServiceAccount(hookRun);
      }
    );

    apiTest(
      "keeps the account's identity when a user approves a bound hook workflow",
      async ({ apiClient }) => {
        apiTest.setTimeout(ROUND_WITH_PAUSED_HOOK_TIMEOUT);
        await converse(apiClient, approvalAgentId, 'approval pending');

        const paused = await getOnlyExecution(apiClient, approvalWorkflowId);
        expect(paused.status).toBe('waiting_for_input');
        const approval = paused.stepExecutions?.find(({ stepId }) => stepId === 'approval');
        expect(approval?.status).toBe('waiting_for_input');

        const resumed = await apiClient.post(`/api/workflows/executions/${paused.id}/resume`, {
          headers: adminHeaders(),
          body: { input: { approved: true }, stepExecutionId: approval?.id },
          responseType: 'json',
        });
        expect(resumed, JSON.stringify(resumed.body)).toHaveStatusCode(200);

        await expect
          .poll(
            async () =>
              TerminalExecutionStatuses.includes((await getExecution(apiClient, paused.id)).status),
            { timeout: ROUND_WITH_PAUSED_HOOK_TIMEOUT / 2 }
          )
          .toBe(true);
        const approved = await getExecution(apiClient, paused.id);
        expect(approved.status).toBe('completed');
        expectRanAsServiceAccount(approved);
      }
    );
  }
);
