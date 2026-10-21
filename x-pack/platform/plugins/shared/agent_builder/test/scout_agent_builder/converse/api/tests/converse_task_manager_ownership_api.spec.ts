/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { tags, type ApiClientFixture } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import { ExecutionStatus, TerminalExecutionStatuses } from '@kbn/workflows';
import { AgentAccessControlMode, type Conversation } from '@kbn/agent-builder-common';
import {
  createGenAiConnectorForProxy,
  deleteConnectorById,
} from '../../../../scout_agent_builder_shared/lib/connector_kbn';
import {
  setupAgentCallToolThenAnswer,
  setupAgentDirectAnswer,
} from '../../../../scout_agent_builder_shared/lib/proxy_scenario';
import {
  apiTest,
  API_AGENT_BUILDER,
  CHAT_CONVERSATIONS_INDEX,
  COMMON_HEADERS,
  ELASTIC_API_VERSION,
} from '../fixtures';

const TEST_PREFIX = 'task-manager-ownership-test';

interface WorkflowExecution {
  status?: ExecutionStatus;
  error?: unknown;
}

const readSessionCookie = (setCookie: string | string[] | undefined): string => {
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie ?? ''];
  const sid = cookies.map((cookie) => cookie.split(';')[0]).find((pair) => pair.startsWith('sid='));

  expect(sid).toBeDefined();
  return sid as string;
};

const workflowYaml = ({
  connectorId,
  conversationId,
}: {
  connectorId: string;
  conversationId: string;
}) => `name: ${TEST_PREFIX}
enabled: true
triggers:
  - type: manual
steps:
  - name: follow_up
    type: ai.agent
    connector-id: "${connectorId}"
    with:
      conversation_id: "${conversationId}"
      message: "Follow up from a workflow."
`;

apiTest.describe(
  'Agent Builder — Task Manager runs act as the API key owner',
  { tag: [...tags.stateful.classic] },
  () => {
    const testRunId = randomUUID();
    const roleName = `${TEST_PREFIX}-role-${testRunId}`;
    const owner = { username: `${TEST_PREFIX}-owner-${testRunId}`, password: 'owner-password' };
    const workflowId = `${TEST_PREFIX}-${testRunId.slice(0, 8)}`;
    const agentId = `${TEST_PREFIX}-agent-${testRunId.slice(0, 8)}`;
    const apiKeyIds: string[] = [];

    let llmProxy: LlmProxy;
    let connectorId: string;

    apiTest.beforeAll(async ({ esClient, kbnClient, log }) => {
      llmProxy = await createLlmProxy(log);
      ({ id: connectorId } = await createGenAiConnectorForProxy(kbnClient, llmProxy));

      await kbnClient.request({
        method: 'PUT',
        path: `/api/security/role/${encodeURIComponent(roleName)}`,
        headers: { 'elastic-api-version': ELASTIC_API_VERSION },
        body: {
          elasticsearch: {
            cluster: ['manage_own_api_key', 'monitor_inference'],
            indices: [],
            run_as: [],
          },
          kibana: [
            {
              base: [],
              feature: {
                agentBuilder: ['minimal_read', 'manage_agents'],
                workflowsManagement: ['all'],
                actions: ['read'],
              },
              spaces: ['*'],
            },
          ],
        },
      });

      await esClient.security.putUser({
        username: owner.username,
        password: owner.password,
        roles: [roleName],
      });
    });

    apiTest.afterAll(async ({ asAdmin, esClient, kbnClient }) => {
      await asAdmin.delete('api/workflows?force=true', {
        headers: { 'elastic-api-version': ELASTIC_API_VERSION },
        body: { ids: [workflowId] },
        responseType: 'json',
      });

      await kbnClient.request({
        method: 'DELETE',
        path: `${API_AGENT_BUILDER}/agents/${encodeURIComponent(agentId)}`,
        headers: { 'elastic-api-version': ELASTIC_API_VERSION },
        ignoreErrors: [404],
      });

      if (apiKeyIds.length > 0) {
        await esClient.security.invalidateApiKey({ ids: apiKeyIds });
      }

      await esClient.deleteByQuery({
        index: CHAT_CONVERSATIONS_INDEX,
        query: { term: { user_name: owner.username } },
        wait_for_completion: true,
        refresh: true,
        conflicts: 'proceed',
        ignore_unavailable: true,
      });

      llmProxy.close();
      await deleteConnectorById(kbnClient, connectorId);

      await esClient.security.deleteUser({ username: owner.username }, { ignore: [404] });
      await kbnClient.request({
        method: 'DELETE',
        path: `/api/security/role/${encodeURIComponent(roleName)}`,
        headers: { 'elastic-api-version': ELASTIC_API_VERSION },
        ignoreErrors: [404],
      });
    });

    const loginAndCreateApiKey = async (apiClient: ApiClientFixture) => {
      const loginResponse = await apiClient.post('/internal/security/login', {
        headers: COMMON_HEADERS,
        body: {
          providerType: 'basic',
          providerName: 'cloud-basic',
          currentURL: '/',
          params: { username: owner.username, password: owner.password },
        },
      });
      expect(loginResponse).toHaveStatusCode(200);

      const sessionHeaders = {
        ...COMMON_HEADERS,
        Cookie: readSessionCookie(loginResponse.headers['set-cookie']),
        'elastic-api-version': ELASTIC_API_VERSION,
      };

      const apiKeyResponse = await apiClient.post('/internal/security/api_key', {
        headers: sessionHeaders,
        body: { name: `${TEST_PREFIX}-key`, role_descriptors: {} },
        responseType: 'json',
      });
      expect(apiKeyResponse).toHaveStatusCode(200);

      const { id: apiKeyId, encoded } = apiKeyResponse.body as { id: string; encoded: string };
      apiKeyIds.push(apiKeyId);

      const apiKeyHeaders = {
        ...COMMON_HEADERS,
        Authorization: `ApiKey ${encoded}`,
        'elastic-api-version': ELASTIC_API_VERSION,
      };

      return { sessionHeaders, apiKeyHeaders };
    };

    apiTest('the owner of a private agent can run it on Task Manager', async ({ apiClient }) => {
      const { sessionHeaders, apiKeyHeaders } = await loginAndCreateApiKey(apiClient);

      const createAgentResponse = await apiClient.post(`${API_AGENT_BUILDER}/agents`, {
        headers: sessionHeaders,
        body: {
          id: agentId,
          name: 'Private agent',
          description: 'Private agent owned by the test owner',
          access_control: { access_mode: AgentAccessControlMode.Private },
          configuration: { instructions: 'Respond directly to the user', tools: [] },
        },
        responseType: 'json',
      });
      expect(createAgentResponse).toHaveStatusCode(200);

      const converseOnTaskManager = async (
        headers: Record<string, string>
      ): Promise<Conversation> => {
        await setupAgentDirectAnswer({
          proxy: llmProxy,
          title: 'Private agent run',
          response: 'Private agent response',
        });

        const response = await apiClient.post(`${API_AGENT_BUILDER}/converse`, {
          headers,
          body: {
            agent_id: agentId,
            input: 'Hello from Task Manager',
            connector_id: connectorId,
            _execution_mode: 'task_manager',
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);

        const { conversation_id: conversationId } = response.body as { conversation_id: string };
        const conversationResponse = await apiClient.get(
          `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationId)}`,
          { headers: sessionHeaders, responseType: 'json' }
        );
        expect(conversationResponse).toHaveStatusCode(200);

        return conversationResponse.body as Conversation;
      };

      await apiTest.step('scheduled from a session', async () => {
        const conversation = await converseOnTaskManager(sessionHeaders);

        expect(conversation.rounds).toHaveLength(1);
        expect(conversation.rounds[0].response.message).toBe('Private agent response');
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
      });

      await apiTest.step('scheduled with an API key', async () => {
        const conversation = await converseOnTaskManager(apiKeyHeaders);

        expect(conversation.rounds).toHaveLength(1);
        expect(conversation.rounds[0].response.message).toBe('Private agent response');
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
      });
    });

    apiTest(
      'the agent can write metadata to its owner private conversation on Task Manager',
      async ({ apiClient }) => {
        const { sessionHeaders, apiKeyHeaders } = await loginAndCreateApiKey(apiClient);

        const createResponse = await apiClient.post(`${API_AGENT_BUILDER}/conversations`, {
          headers: sessionHeaders,
          body: { template_id: 'investigation' },
          responseType: 'json',
        });
        expect(createResponse).toHaveStatusCode(200);

        const { id: conversationId } = createResponse.body as { id: string };

        setupAgentCallToolThenAnswer({
          proxy: llmProxy,
          toolName: 'set_conversation_metadata',
          toolArg: { metadata: { severity: 'high' } },
          response: 'Severity set',
        });

        const converseResponse = await apiClient.post(`${API_AGENT_BUILDER}/converse`, {
          headers: apiKeyHeaders,
          body: {
            conversation_id: conversationId,
            input: 'Set the severity to high',
            connector_id: connectorId,
            _execution_mode: 'task_manager',
          },
          responseType: 'json',
        });
        expect(converseResponse).toHaveStatusCode(200);
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        const conversationResponse = await apiClient.get(
          `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationId)}`,
          { headers: sessionHeaders, responseType: 'json' }
        );
        expect(conversationResponse).toHaveStatusCode(200);
        expect((conversationResponse.body as Conversation).metadata).toMatchObject({
          severity: 'high',
        });
      }
    );

    apiTest(
      'a workflow run by the owner continues their private conversation',
      async ({ apiClient }) => {
        apiTest.setTimeout(300_000);

        const { sessionHeaders, apiKeyHeaders } = await loginAndCreateApiKey(apiClient);

        await setupAgentDirectAnswer({
          proxy: llmProxy,
          title: 'Private conversation',
          response: 'First answer',
        });
        const converseResponse = await apiClient.post(`${API_AGENT_BUILDER}/converse`, {
          headers: sessionHeaders,
          body: { input: 'Hello', connector_id: connectorId, _execution_mode: 'local' },
          responseType: 'json',
        });
        expect(converseResponse).toHaveStatusCode(200);
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        const { conversation_id: conversationId } = converseResponse.body as {
          conversation_id: string;
        };

        const createWorkflowResponse = await apiClient.post('api/workflows/workflow', {
          headers: sessionHeaders,
          body: { id: workflowId, yaml: workflowYaml({ connectorId, conversationId }) },
          responseType: 'json',
        });
        expect(createWorkflowResponse).toHaveStatusCode(200);

        const getRoundCount = async (): Promise<number> => {
          const response = await apiClient.get(
            `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationId)}`,
            { headers: sessionHeaders, responseType: 'json' }
          );
          expect(response).toHaveStatusCode(200);

          return (response.body as Conversation).rounds.length;
        };

        const runWorkflow = async (headers: Record<string, string>): Promise<WorkflowExecution> => {
          await setupAgentDirectAnswer({
            proxy: llmProxy,
            continueConversation: true,
            response: 'Workflow answer',
          });

          const runResponse = await apiClient.post(`api/workflows/workflow/${workflowId}/run`, {
            headers,
            body: { inputs: {} },
            responseType: 'json',
          });
          expect(runResponse).toHaveStatusCode(200);

          const { workflowExecutionId } = runResponse.body as { workflowExecutionId: string };
          let execution: WorkflowExecution = {};

          await expect
            .poll(
              async () => {
                execution = (
                  await apiClient.get(`api/workflows/executions/${workflowExecutionId}`, {
                    headers: sessionHeaders,
                    responseType: 'json',
                  })
                ).body as WorkflowExecution;

                return (
                  execution.status !== undefined &&
                  TerminalExecutionStatuses.includes(execution.status)
                );
              },
              { timeout: 120_000 }
            )
            .toBe(true);

          return execution;
        };

        await apiTest.step('run from the owner session', async () => {
          const execution = await runWorkflow(sessionHeaders);

          expect(execution.status, JSON.stringify(execution.error)).toBe(ExecutionStatus.COMPLETED);
          await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
          expect(await getRoundCount()).toBe(2);
        });

        await apiTest.step('run with the owner API key', async () => {
          const execution = await runWorkflow(apiKeyHeaders);

          expect(execution.status, JSON.stringify(execution.error)).toBe(ExecutionStatus.COMPLETED);
          await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
          expect(await getRoundCount()).toBe(3);
        });
      }
    );
  }
);
