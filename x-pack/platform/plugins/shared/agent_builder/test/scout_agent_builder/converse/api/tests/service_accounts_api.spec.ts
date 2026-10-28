/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import { ConversationAccessControlMode, TimelineEventType } from '@kbn/agent-builder-common';
import type {
  AddConversationEventsResponse,
  CreateConversationResponse,
  GetConversationResponse,
} from '../../../../../common/http_api/conversations';
import { chatApiPath } from '../../../../../common/constants';
import { agentBuilderRole } from '../../../../scout_agent_builder_shared/lib/roles';
import {
  createGenAiConnectorForProxy,
  deleteConnectorById,
} from '../../../../scout_agent_builder_shared/lib/connector_kbn';
import { setupAgentDirectAnswer } from '../../../../scout_agent_builder_shared/lib/proxy_scenario';
import {
  mockAgentToolCall,
  mockFinalAnswer,
  mockTitleGeneration,
} from '../../../../scout_agent_builder_shared/lib/proxy_scenario/calls';
import { deleteAllConversationsFromEs } from '../../../../scout_agent_builder_shared/lib/conversations_es';
import {
  createServiceAccountWithToken,
  deleteServiceAccount,
  uniqueServiceAccountName,
  type TestServiceAccount,
} from '../../../../scout_agent_builder_shared/lib/service_accounts_es';
import {
  apiTest,
  API_AGENT_BUILDER,
  COMMON_HEADERS,
  ELASTIC_API_VERSION,
  getConversation,
  postConverse,
  type ExecutionMode,
} from '../fixtures';

// User-managed Elasticsearch service accounts do not exist on serverless, which runs UIAM.
const STATEFUL_ONLY = tags.stateful.classic;

const CONVERSATIONS_PATH = `${API_AGENT_BUILDER}/conversations`;
const CONVERSATION_PATH = (id: string) => `${CONVERSATIONS_PATH}/${encodeURIComponent(id)}`;
const ADD_EVENTS_PATH = (id: string) => `${CONVERSATION_PATH(id)}/_add_events`;
const CHAT_CONVERSE = `${chatApiPath}/converse`;
const EXECUTION_MODES: ExecutionMode[] = ['local', 'task_manager'];

const ROLE_NAME = 'agent-builder-service-account-role';
const NOTE_EVENT = { type: 'text_note', data: { text: 'from the service account' } };

apiTest.describe('Agent Builder — service accounts', { tag: STATEFUL_ONLY }, () => {
  let serviceAccount: TestServiceAccount;
  let asServiceAccount: Record<string, string>;
  let adminCredentials: RoleApiCredentials;
  let llmProxy: LlmProxy;
  let connectorId: string;
  const principalId = () => `service_account:${serviceAccount.id}`;

  apiTest.beforeAll(async ({ esClient, kbnClient, requestAuth, log }) => {
    adminCredentials = await requestAuth.getApiKeyForAdmin();
    llmProxy = await createLlmProxy(log);
    ({ id: connectorId } = await createGenAiConnectorForProxy(kbnClient, llmProxy));

    await kbnClient.request({
      method: 'PUT',
      path: `/api/security/role/${ROLE_NAME}`,
      headers: { 'elastic-api-version': ELASTIC_API_VERSION },
      body: agentBuilderRole('*', ['read']),
    });

    serviceAccount = await createServiceAccountWithToken(esClient, {
      name: uniqueServiceAccountName('agent-builder'),
      roles: [ROLE_NAME],
    });
    asServiceAccount = { ...COMMON_HEADERS, ...serviceAccount.authHeader };
  });

  apiTest.afterAll(async ({ esClient, kbnClient }) => {
    llmProxy.close();
    await deleteConnectorById(kbnClient, connectorId);
    await deleteAllConversationsFromEs(esClient);
    await deleteServiceAccount(esClient, serviceAccount.name);
    await kbnClient.request({
      method: 'DELETE',
      path: `/api/security/role/${ROLE_NAME}`,
      headers: { 'elastic-api-version': ELASTIC_API_VERSION },
      ignoreErrors: [404],
    });
  });

  apiTest('creates a public conversation under its own identity', async ({ apiClient }) => {
    const created = await apiClient.post(CONVERSATIONS_PATH, {
      headers: asServiceAccount,
      body: {
        title: 'Created by a service account',
        access_control: { access_mode: ConversationAccessControlMode.Public },
      },
      responseType: 'json',
    });

    expect(created).toHaveStatusCode(200);
    const conversation = created.body as CreateConversationResponse;
    expect(conversation.user).toMatchObject({
      id: `service_account:${serviceAccount.id}`,
      username: serviceAccount.id,
      type: 'service_account',
    });
  });

  apiTest('reads back its own conversation as the owner', async ({ apiClient }) => {
    const created = await apiClient.post(CONVERSATIONS_PATH, {
      headers: asServiceAccount,
      body: { title: 'Owned' },
      responseType: 'json',
    });
    const { id } = created.body as CreateConversationResponse;

    const fetched = await apiClient.get(CONVERSATION_PATH(id), {
      headers: asServiceAccount,
      responseType: 'json',
    });

    expect(fetched).toHaveStatusCode(200);
  });

  apiTest(
    'attributes messages it posts to a public conversation owned by a user',
    async ({ apiClient, asAdmin }) => {
      const created = await asAdmin.post(CONVERSATIONS_PATH, {
        body: { access_control: { access_mode: ConversationAccessControlMode.Public } },
        responseType: 'json',
      });
      expect(created).toHaveStatusCode(200);
      const { id } = created.body as CreateConversationResponse;

      const appended = await apiClient.post(CHAT_CONVERSE, {
        headers: asServiceAccount,
        body: { trigger_mode: 'never', conversation_id: id, input: 'automated update' },
        responseType: 'json',
      });
      expect(appended).toHaveStatusCode(200);

      const fetched = await apiClient.get(CONVERSATION_PATH(id), {
        headers: asServiceAccount,
        responseType: 'json',
      });
      const { events } = fetched.body as GetConversationResponse;
      const userMessage = events?.find((event) => event.type === TimelineEventType.userMessage);

      expect(userMessage?.actor).toMatchObject({
        type: 'user',
        id: `service_account:${serviceAccount.id}`,
        principal_type: 'service_account',
      });
    }
  );

  apiTest(
    'attributes custom events it adds to a public conversation',
    async ({ apiClient, asAdmin }) => {
      const created = await asAdmin.post(CONVERSATIONS_PATH, {
        body: { access_control: { access_mode: ConversationAccessControlMode.Public } },
        responseType: 'json',
      });
      const { id } = created.body as CreateConversationResponse;

      const added = await apiClient.post(ADD_EVENTS_PATH(id), {
        headers: { ...asServiceAccount, 'elastic-api-version': ELASTIC_API_VERSION },
        body: { events: [NOTE_EVENT] },
        responseType: 'json',
      });

      expect(added).toHaveStatusCode(200);
      const { events } = added.body as AddConversationEventsResponse;
      expect(events[0].actor).toMatchObject({
        type: 'user',
        id: `service_account:${serviceAccount.id}`,
        principal_type: 'service_account',
      });
    }
  );

  for (const mode of EXECUTION_MODES) {
    apiTest(
      `creates and owns a public conversation through converse [${mode}]`,
      async ({ apiClient }) => {
        await setupAgentDirectAnswer({ proxy: llmProxy, response: 'Hello from the agent' });

        const res = await postConverse(
          apiClient,
          serviceAccount.authHeader,
          {
            input: 'Hello',
            connector_id: connectorId,
            access_control: { access_mode: ConversationAccessControlMode.Public },
          },
          mode
        );
        expect(res).toHaveStatusCode(200);
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        const { conversation_id: id } = res.body as { conversation_id: string };
        const conversation = await getConversation(apiClient, serviceAccount.authHeader, id);
        expect(conversation.user).toMatchObject({
          id: principalId(),
          username: serviceAccount.id,
          type: 'service_account',
        });
        expect(conversation.rounds[0].author).toMatchObject({
          id: principalId(),
          type: 'service_account',
        });
        expect(conversation.rounds[0].response.message).toBe('Hello from the agent');

        const listed = await apiClient.get(CONVERSATIONS_PATH, {
          headers: asServiceAccount,
          responseType: 'json',
        });
        expect(listed).toHaveStatusCode(200);
        const { results } = listed.body as { results: Array<{ id: string; user: unknown }> };
        expect(results.find((item) => item.id === id)?.user).toMatchObject({
          type: 'service_account',
        });
      }
    );

    apiTest(
      `joins a user's public conversation through converse [${mode}]`,
      async ({ apiClient }) => {
        await setupAgentDirectAnswer({ proxy: llmProxy, response: 'Admin round' });
        const first = await postConverse(
          apiClient,
          adminCredentials.apiKeyHeader,
          {
            input: 'Start',
            connector_id: connectorId,
            access_control: { access_mode: ConversationAccessControlMode.Public },
          },
          mode
        );
        expect(first).toHaveStatusCode(200);
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
        const { conversation_id: id } = first.body as { conversation_id: string };

        await setupAgentDirectAnswer({
          proxy: llmProxy,
          response: 'Service account round',
          continueConversation: true,
        });
        const second = await apiClient.post(CHAT_CONVERSE, {
          headers: asServiceAccount,
          body: {
            input: 'Automated follow-up',
            conversation_id: id,
            connector_id: connectorId,
            _execution_mode: mode,
          },
          responseType: 'json',
        });
        expect(second).toHaveStatusCode(200);
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        const conversation = await getConversation(apiClient, serviceAccount.authHeader, id);
        expect(conversation.user.type).not.toBe('service_account');
        const lastRound = conversation.rounds[conversation.rounds.length - 1];
        expect(lastRound.author).toMatchObject({ id: principalId(), type: 'service_account' });
        expect(lastRound.response.message).toBe('Service account round');
      }
    );
  }

  apiTest('runs tools with its own Elasticsearch privileges', async ({ apiClient, esClient }) => {
    const index = `agent-builder-sa-restricted-${Date.now()}`;
    const marker = 'only admins can see this';
    await esClient.indices.create({ index });
    await esClient.index({ index, document: { message: marker }, refresh: 'wait_for' });

    const runEsqlTool = async (authHeaders: Record<string, string>) => {
      mockTitleGeneration(llmProxy, 'Tool run');
      mockAgentToolCall({
        llmProxy,
        toolName: 'platform_core_execute_esql',
        toolArg: { query: `FROM ${index} | LIMIT 1` },
      });
      mockFinalAnswer(llmProxy, 'done');

      const res = await postConverse(
        apiClient,
        authHeaders,
        { input: 'read the index', connector_id: connectorId },
        'local'
      );
      expect(res).toHaveStatusCode(200);
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      const { conversation_id: id } = res.body as { conversation_id: string };
      const conversation = await getConversation(apiClient, authHeaders, id);
      const toolStep = conversation.rounds[0].steps.find((step) => step.type === 'tool_call');
      expect(toolStep).toBeDefined();
      return JSON.stringify(toolStep);
    };

    try {
      expect(await runEsqlTool(adminCredentials.apiKeyHeader)).toContain(marker);

      const asServiceAccountStep = await runEsqlTool(serviceAccount.authHeader);
      expect(asServiceAccountStep).not.toContain(marker);
      expect(asServiceAccountStep).toContain('"type":"error"');
    } finally {
      await esClient.indices.delete({ index }, { ignore: [404] });
    }
  });

  apiTest('cannot reach a private conversation it does not own', async ({ apiClient, asAdmin }) => {
    const created = await asAdmin.post(CONVERSATIONS_PATH, {
      body: { access_control: { access_mode: ConversationAccessControlMode.Private } },
      responseType: 'json',
    });
    const { id } = created.body as CreateConversationResponse;

    const fetched = await apiClient.get(CONVERSATION_PATH(id), {
      headers: asServiceAccount,
      responseType: 'json',
    });

    expect(fetched).toHaveStatusCode(404);
  });

  apiTest(
    'refuses a service account without Agent Builder privileges',
    async ({ apiClient, esClient }) => {
      // Built-in account whose fixed roles grant nothing in Agent Builder.
      const tokenName = `agent-builder-scout-${Date.now()}`;
      const { token } = await esClient.security.createServiceToken({
        namespace: 'elastic',
        service: 'fleet-server',
        name: tokenName,
      });

      try {
        const response = await apiClient.post(CHAT_CONVERSE, {
          headers: { ...COMMON_HEADERS, Authorization: `Bearer ${token.value}` },
          body: { input: 'should not be allowed' },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(403);
      } finally {
        await esClient.security.deleteServiceToken({
          namespace: 'elastic',
          service: 'fleet-server',
          name: tokenName,
        });
      }
    }
  );
});
