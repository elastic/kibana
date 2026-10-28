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
import { AgentAccessControlMode, ConversationAccessControlMode } from '@kbn/agent-builder-common';
import type {
  AgentDefinitionWithPermissions,
  ListAgentResponse,
} from '../../../../../common/http_api/agents';
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
import { deleteConversationsByIds } from '../../../../scout_agent_builder_shared/lib/conversations_es';
import {
  ES_SERVICE_ACCOUNT_NAMESPACE,
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
} from '../fixtures';

// Bindings need user-managed Elasticsearch service accounts, which serverless (UIAM) does not offer.
const STATEFUL_ONLY = tags.stateful.classic;

const AGENTS_PATH = `${API_AGENT_BUILDER}/agents`;
const AGENT_PATH = (id: string) => `${AGENTS_PATH}/${encodeURIComponent(id)}`;
const SERVICE_ACCOUNTS_PATH = '/internal/security/service_account';
// Binding has no public API: owning plugins bind through the agent registry on the start
// contract. The Scout test plugin exposes that call on this route, as the requesting user.
const BIND_TEST_PATH = (id: string) =>
  `/internal/agent_builder_test/agents/${encodeURIComponent(id)}/service_account`;
const WORKLOADS_PATH = (serviceAccountId: string) =>
  `${SERVICE_ACCOUNTS_PATH}/${encodeURIComponent(serviceAccountId)}/workloads`;

const basicAuthHeader = (username: string, password: string): Record<string, string> => ({
  Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
});

apiTest.describe(
  'Agent Builder — agents bound to a service account',
  { tag: STATEFUL_ONLY },
  () => {
    const runId = randomUUID();
    const agentId = `bound-agent-${runId}`;
    const privateAgentId = `bound-private-agent-${runId}`;
    const restrictedIndex = `agent-builder-bound-restricted-${runId}`;
    const marker = 'only the service account can see this';
    const password = `bound-agent-${runId}`;

    // Who can chat: `all` includes the invoke_bound_agents sub-feature privilege, `read` does not.
    const editor = { username: `bound-editor-${runId}`, role: `bound-editor-role-${runId}` };
    const viewer = { username: `bound-viewer-${runId}`, role: `bound-viewer-role-${runId}` };
    // Who can bind: agent write access plus the manage_security cluster privilege.
    const binder = { username: `bound-binder-${runId}`, role: `bound-binder-role-${runId}` };
    const serviceAccountRole = `bound-service-account-role-${runId}`;

    const asEditor = basicAuthHeader(editor.username, password);
    const asViewer = basicAuthHeader(viewer.username, password);
    const asBinder = basicAuthHeader(binder.username, password);

    let adminCredentials: RoleApiCredentials;
    let adminCookieHeader: Record<string, string>;
    /** The account the agents are bound to; it holds the invoke privilege and the index grant. */
    let serviceAccount: TestServiceAccount;
    /** A relay-style caller: the invoke privilege, no index grant, not bound to anything. */
    let relayAccount: TestServiceAccount;
    /** A caller without the invoke privilege. */
    let strangerAccount: TestServiceAccount;
    let llmProxy: LlmProxy;
    let connectorId: string;

    const adminInternalHeaders = () => ({
      ...COMMON_HEADERS,
      ...adminCookieHeader,
      'elastic-api-version': ELASTIC_API_VERSION,
    });

    type ApiClient = Parameters<typeof postConverse>[0];

    // Started before the binding, continued once the agent is bound.
    let viewerConversationId: string;
    let editorConversationId: string;

    const updateAgent = (
      apiClient: ApiClient,
      headers: Record<string, string>,
      body: Record<string, unknown>
    ) =>
      apiClient.put(AGENT_PATH(agentId), {
        headers: { ...COMMON_HEADERS, ...headers },
        body,
        responseType: 'json',
      });

    const bindAgent = (
      apiClient: ApiClient,
      headers: Record<string, string>,
      serviceAccountId: string | null,
      id = agentId
    ) =>
      apiClient.put(BIND_TEST_PATH(id), {
        headers: { ...COMMON_HEADERS, 'x-elastic-internal-origin': 'kibana', ...headers },
        body: { service_account_id: serviceAccountId },
        responseType: 'json',
      });

    const boundWorkloads = async (kbnClient: { request: (opts: any) => Promise<any> }) => {
      const { data } = await kbnClient.request({
        method: 'GET',
        path: WORKLOADS_PATH(serviceAccount.id),
        headers: adminInternalHeaders(),
      });
      return JSON.stringify(data);
    };

    // Only this suite's conversations are removed in teardown; the index is shared.
    const conversationIds: string[] = [];

    /** Starts a conversation that needs no tool, and returns its id. */
    const startConversation = async (
      apiClient: ApiClient,
      authHeaders: Record<string, string>,
      accessMode: ConversationAccessControlMode
    ) => {
      await setupAgentDirectAnswer({ proxy: llmProxy, response: 'as yourself' });
      const res = await postConverse(
        apiClient,
        authHeaders,
        {
          agent_id: agentId,
          input: 'hello',
          connector_id: connectorId,
          access_control: { access_mode: accessMode },
        },
        'task_manager'
      );
      expect(res).toHaveStatusCode(200);
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
      const { conversation_id: id } = res.body as { conversation_id: string };
      conversationIds.push(id);
      return id;
    };

    /**
     * Runs one round that queries the restricted index through the ES|QL tool, as a new
     * conversation or as the next round of `conversationId`, and returns the round's tool step.
     */
    const runEsqlTool = async (
      apiClient: ApiClient,
      authHeaders: Record<string, string>,
      {
        mode = 'task_manager',
        conversationId,
        agent = agentId,
      }: { mode?: 'local' | 'task_manager'; conversationId?: string; agent?: string } = {}
    ) => {
      if (!conversationId) {
        mockTitleGeneration(llmProxy, 'Tool run');
      }
      mockAgentToolCall({
        llmProxy,
        toolName: 'platform_core_execute_esql',
        toolArg: { query: `FROM ${restrictedIndex} | LIMIT 1` },
      });
      mockFinalAnswer(llmProxy, 'done');

      const res = await postConverse(
        apiClient,
        authHeaders,
        {
          agent_id: agent,
          ...(conversationId ? { conversation_id: conversationId } : {}),
          input: 'read the index',
          connector_id: connectorId,
        },
        mode
      );
      expect(res, JSON.stringify(res.body)).toHaveStatusCode(200);
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      const { conversation_id: id } = res.body as { conversation_id: string };
      if (!conversationId) {
        conversationIds.push(id);
      }
      const conversation = await getConversation(apiClient, authHeaders, id);
      const round = conversation.rounds[conversation.rounds.length - 1];
      const toolStep = round.steps.find((step) => step.type === 'tool_call');
      expect(toolStep).toBeDefined();
      return { conversation, conversationId: id, toolStep: JSON.stringify(toolStep) };
    };

    const createAgent = (apiClient: ApiClient, id: string, accessMode: AgentAccessControlMode) =>
      apiClient.post(AGENTS_PATH, {
        headers: { ...COMMON_HEADERS, ...asEditor },
        body: {
          id,
          name: `Bound agent ${accessMode}`,
          description: 'Runs as a service account',
          access_control: { access_mode: accessMode },
          configuration: { instructions: 'Answer briefly.', tools: [{ tool_ids: ['*'] }] },
        },
        responseType: 'json',
      });

    apiTest.beforeAll(async ({ apiClient, esClient, kbnClient, requestAuth, samlAuth, log }) => {
      adminCredentials = await requestAuth.getApiKeyForAdmin();
      ({ cookieHeader: adminCookieHeader } = await samlAuth.asInteractiveUser('admin'));
      llmProxy = await createLlmProxy(log);
      ({ id: connectorId } = await createGenAiConnectorForProxy(kbnClient, llmProxy));

      await esClient.indices.create({ index: restrictedIndex });
      await esClient.index({
        index: restrictedIndex,
        document: { message: marker },
        refresh: true,
      });

      const roles: Array<[string, unknown]> = [
        [editor.role, agentBuilderRole('*', ['all'])],
        [viewer.role, agentBuilderRole('*', ['read'])],
        [
          binder.role,
          {
            ...agentBuilderRole('*', ['all']),
            elasticsearch: { cluster: ['manage_security'], indices: [] },
          },
        ],
        [
          serviceAccountRole,
          {
            ...agentBuilderRole('*', ['all']),
            elasticsearch: {
              cluster: [],
              indices: [{ names: [restrictedIndex], privileges: ['read'] }],
            },
          },
        ],
      ];
      for (const [name, role] of roles) {
        await kbnClient.request({
          method: 'PUT',
          path: `/api/security/role/${name}`,
          headers: { 'elastic-api-version': ELASTIC_API_VERSION },
          body: role,
        });
      }
      for (const user of [editor, viewer, binder]) {
        await kbnClient.request({
          method: 'POST',
          path: `/internal/security/users/${encodeURIComponent(user.username)}`,
          headers: adminInternalHeaders(),
          body: { username: user.username, password, roles: [user.role], enabled: true },
        });
      }

      // Created through Kibana, which keeps the credential Core exchanges for a run-time token.
      // An account created directly in Elasticsearch cannot be assumed by a bound workload.
      const serviceAccountName = uniqueServiceAccountName('bound-agent');
      const { data: account } = await kbnClient.request<{ id: string }>({
        method: 'POST',
        path: SERVICE_ACCOUNTS_PATH,
        headers: adminInternalHeaders(),
        body: { name: serviceAccountName, roles: [serviceAccountRole] },
      });
      expect(account.id).toBe(`${ES_SERVICE_ACCOUNT_NAMESPACE}/${serviceAccountName}`);
      const { token } = await esClient.security.createServiceToken({
        namespace: ES_SERVICE_ACCOUNT_NAMESPACE,
        service: serviceAccountName,
        name: 'scout-test',
      });
      serviceAccount = {
        id: account.id,
        name: serviceAccountName,
        authHeader: { Authorization: `Bearer ${token.value}` },
      };
      // These two only call the agent, so they need no credential Kibana can assume.
      relayAccount = await createServiceAccountWithToken(esClient, {
        name: uniqueServiceAccountName('bound-relay'),
        roles: [editor.role],
      });
      strangerAccount = await createServiceAccountWithToken(esClient, {
        name: uniqueServiceAccountName('bound-stranger'),
        roles: [viewer.role],
      });

      // The editor owns both agents, so only manage_security separates it from the binder.
      expect(await createAgent(apiClient, agentId, AgentAccessControlMode.Public)).toHaveStatusCode(
        200
      );
      expect(
        await createAgent(apiClient, privateAgentId, AgentAccessControlMode.Private)
      ).toHaveStatusCode(200);

      // Conversations started before the binding, continued once the agent is bound.
      viewerConversationId = await startConversation(
        apiClient,
        asViewer,
        ConversationAccessControlMode.Private
      );
      const beforeBinding = await runEsqlTool(apiClient, asEditor);
      editorConversationId = beforeBinding.conversationId;
      expect(beforeBinding.toolStep).not.toContain(marker);

      const bound = await bindAgent(apiClient, asBinder, serviceAccount.id);
      expect(bound).toHaveStatusCode(200);
      expect((bound.body as { service_account_id?: string }).service_account_id).toBe(
        serviceAccount.id
      );
      // The binder holds no access to the editor's private agent; an admin binds that one.
      const boundPrivate = await bindAgent(
        apiClient,
        adminCredentials.apiKeyHeader,
        serviceAccount.id,
        privateAgentId
      );
      expect(boundPrivate).toHaveStatusCode(200);
    });

    apiTest.afterAll(async ({ esClient, kbnClient, apiClient }) => {
      llmProxy.close();
      for (const id of [agentId, privateAgentId]) {
        await apiClient.delete(AGENT_PATH(id), {
          headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
          responseType: 'json',
        });
      }
      await deleteConnectorById(kbnClient, connectorId);
      await deleteConversationsByIds(kbnClient, conversationIds);
      // Kibana removes the account, its tokens and its stored credential; deleting it in
      // Elasticsearch first would make Kibana keep the credential record behind.
      await kbnClient.request({
        method: 'DELETE',
        path: `${SERVICE_ACCOUNTS_PATH}/${encodeURIComponent(serviceAccount.id)}?force=true`,
        headers: adminInternalHeaders(),
        ignoreErrors: [404],
      });
      for (const account of [relayAccount, strangerAccount]) {
        await deleteServiceAccount(esClient, account.name);
      }
      await esClient.indices.delete({ index: restrictedIndex }, { ignore: [404] });
      for (const user of [editor, viewer, binder]) {
        await kbnClient.request({
          method: 'DELETE',
          path: `/internal/security/users/${encodeURIComponent(user.username)}`,
          headers: adminInternalHeaders(),
          ignoreErrors: [404],
        });
      }
      for (const name of [editor.role, viewer.role, binder.role, serviceAccountRole]) {
        await kbnClient.request({
          method: 'DELETE',
          path: `/api/security/role/${name}`,
          headers: { 'elastic-api-version': ELASTIC_API_VERSION },
          ignoreErrors: [404],
        });
      }
    });

    apiTest('refuses to change the binding without manage_security', async ({ apiClient }) => {
      const rebind = await bindAgent(apiClient, asEditor, 'kibana/other');
      expect(rebind).toHaveStatusCode(403);

      const unbind = await bindAgent(apiClient, asEditor, null);
      expect(unbind).toHaveStatusCode(403);
    });

    apiTest('reports the binding on read', async ({ apiClient, kbnClient }) => {
      const res = await apiClient.get(AGENT_PATH(agentId), {
        headers: { ...COMMON_HEADERS, ...asBinder },
        responseType: 'json',
      });

      expect(res).toHaveStatusCode(200);
      const agent = res.body as AgentDefinitionWithPermissions;
      expect(agent.service_account_id).toBe(serviceAccount.id);
      expect(agent.permissions.update_agent).toBe(true);
      expect(await boundWorkloads(kbnClient)).toContain(agentId);
    });

    apiTest(
      'runs the conversation as the service account for a caller with the invoke privilege',
      async ({ apiClient }) => {
        const { conversation, toolStep } = await runEsqlTool(apiClient, asEditor);

        // The editor cannot read the index; the marker proves the tool ran with the account's grant.
        expect(toolStep).toContain(marker);
        expect(conversation.user).toMatchObject({ username: editor.username, type: 'user' });
        // Users carry no explicit type; a service account author would.
        expect(conversation.rounds[0].author).toMatchObject({ username: editor.username });
        expect(conversation.rounds[0].author?.type).toBeUndefined();
      }
    );

    apiTest('ignores a request for local execution on a bound agent', async ({ apiClient }) => {
      const { toolStep } = await runEsqlTool(apiClient, asEditor, { mode: 'local' });

      expect(toolStep).toContain(marker);
    });

    apiTest(
      'runs the next round of an earlier conversation as the service account',
      async ({ apiClient }) => {
        const { conversation, toolStep } = await runEsqlTool(apiClient, asEditor, {
          conversationId: editorConversationId,
        });

        expect(conversation.rounds).toHaveLength(2);
        expect(toolStep).toContain(marker);
        expect(conversation.user).toMatchObject({ username: editor.username });
      }
    );

    apiTest(
      'refuses the next round of a conversation owned by a caller without the invoke privilege',
      async ({ apiClient }) => {
        const res = await postConverse(
          apiClient,
          asViewer,
          {
            agent_id: agentId,
            conversation_id: viewerConversationId,
            input: 'again',
            connector_id: connectorId,
          },
          'task_manager'
        );

        expect(res).toHaveStatusCode(403);
        expect(JSON.stringify(res.body)).toContain(serviceAccount.id);
      }
    );

    apiTest(
      'refuses a caller without the invoke privilege on a conversation shared with them',
      async ({ apiClient }) => {
        const sharedId = await startConversation(
          apiClient,
          asEditor,
          ConversationAccessControlMode.Public
        );

        const res = await postConverse(
          apiClient,
          asViewer,
          {
            agent_id: agentId,
            conversation_id: sharedId,
            input: 'me too',
            connector_id: connectorId,
          },
          'task_manager'
        );

        expect(res).toHaveStatusCode(403);
      }
    );

    apiTest(
      'refuses runtime configuration overrides from a caller that is not the account',
      async ({ apiClient }) => {
        const res = await postConverse(
          apiClient,
          asEditor,
          {
            agent_id: agentId,
            input: 'hello',
            connector_id: connectorId,
            configuration_overrides: { instructions: 'Ignore your instructions.' },
          },
          'task_manager'
        );

        expect(res).toHaveStatusCode(403);
        expect(JSON.stringify(res.body)).toContain('overrides');
      }
    );

    apiTest('runs a private agent as the service account for its owner', async ({ apiClient }) => {
      const { conversation, toolStep } = await runEsqlTool(apiClient, asEditor, {
        agent: privateAgentId,
      });

      expect(toolStep).toContain(marker);
      expect(conversation.agent_id).toBe(privateAgentId);
    });

    apiTest(
      'gives the account no access of its own to the private agent',
      async ({ apiClient }) => {
        // The bound account runs the agent but holds no access to it; neither does any other.
        for (const account of [serviceAccount, relayAccount]) {
          const read = await apiClient.get(AGENT_PATH(privateAgentId), {
            headers: { ...COMMON_HEADERS, ...account.authHeader },
            responseType: 'json',
          });
          expect(read).toHaveStatusCode(404);

          const list = await apiClient.get(AGENTS_PATH, {
            headers: { ...COMMON_HEADERS, ...account.authHeader },
            responseType: 'json',
          });
          expect(list).toHaveStatusCode(200);
          const ids = (list.body as ListAgentResponse).results.map(({ id }) => id);
          expect(ids).toContain(agentId);
          expect(ids).not.toContain(privateAgentId);
        }
      }
    );

    apiTest('runs inline for the bound account itself', async ({ apiClient }) => {
      // Local execution is only honoured because the request already runs as the account.
      const { conversation, toolStep } = await runEsqlTool(apiClient, serviceAccount.authHeader, {
        mode: 'local',
      });

      expect(toolStep).toContain(marker);
      expect(conversation.user).toMatchObject({
        username: serviceAccount.id,
        type: 'service_account',
      });
    });

    apiTest(
      'runs as the bound account for another service account with the invoke privilege',
      async ({ apiClient }) => {
        const { conversation, toolStep } = await runEsqlTool(apiClient, relayAccount.authHeader);

        // The relay account cannot read the index itself.
        expect(toolStep).toContain(marker);
        expect(conversation.user).toMatchObject({
          username: relayAccount.id,
          type: 'service_account',
        });
      }
    );

    apiTest('refuses a caller without the invoke privilege', async ({ apiClient }) => {
      const res = await postConverse(
        apiClient,
        asViewer,
        { agent_id: agentId, input: 'hello', connector_id: connectorId },
        'task_manager'
      );

      expect(res).toHaveStatusCode(403);
      expect(JSON.stringify(res.body)).toContain(serviceAccount.id);
    });

    apiTest(
      'refuses a service account caller without the invoke privilege',
      async ({ apiClient }) => {
        const res = await postConverse(
          apiClient,
          strangerAccount.authHeader,
          { agent_id: agentId, input: 'hello', connector_id: connectorId },
          'task_manager'
        );

        expect(res).toHaveStatusCode(403);
      }
    );

    apiTest('refuses any edit of a bound agent without manage_security', async ({ apiClient }) => {
      const res = await updateAgent(apiClient, asEditor, { name: 'Bound agent, renamed' });

      expect(res).toHaveStatusCode(403);
    });

    apiTest('keeps the binding on an edit by a binder', async ({ apiClient }) => {
      const res = await updateAgent(apiClient, asBinder, { name: 'Bound agent, renamed' });

      expect(res).toHaveStatusCode(200);
      expect((res.body as AgentDefinitionWithPermissions).service_account_id).toBe(
        serviceAccount.id
      );
    });

    apiTest('refuses to delete a bound agent without manage_security', async ({ apiClient }) => {
      const res = await apiClient.delete(AGENT_PATH(agentId), {
        headers: { ...COMMON_HEADERS, ...asEditor },
        responseType: 'json',
      });

      expect(res).toHaveStatusCode(403);
    });

    apiTest('runs as the caller again', async ({ apiClient, kbnClient }) => {
      const unbound = await bindAgent(apiClient, asBinder, null);
      expect(unbound).toHaveStatusCode(200);
      expect((unbound.body as { service_account_id?: string }).service_account_id).toBeUndefined();
      expect(await boundWorkloads(kbnClient)).not.toContain(agentId);

      await startConversation(apiClient, asViewer, ConversationAccessControlMode.Private);

      const { toolStep } = await runEsqlTool(apiClient, asEditor);
      expect(toolStep).not.toContain(marker);
      expect(toolStep).toContain('"type":"error"');
    });
  }
);
