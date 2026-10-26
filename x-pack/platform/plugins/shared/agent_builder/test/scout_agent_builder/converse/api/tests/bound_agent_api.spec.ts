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
import type { AgentDefinitionWithPermissions } from '../../../../../common/http_api/agents';
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
  ES_SERVICE_ACCOUNT_NAMESPACE,
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
    let serviceAccount: TestServiceAccount;
    let llmProxy: LlmProxy;
    let connectorId: string;

    const adminInternalHeaders = () => ({
      ...COMMON_HEADERS,
      ...adminCookieHeader,
      'elastic-api-version': ELASTIC_API_VERSION,
    });

    type ApiClient = Parameters<typeof postConverse>[0];

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

    const boundWorkloads = async (kbnClient: { request: (opts: any) => Promise<any> }) => {
      const { data } = await kbnClient.request({
        method: 'GET',
        path: WORKLOADS_PATH(serviceAccount.id),
        headers: adminInternalHeaders(),
      });
      return JSON.stringify(data);
    };

    const runEsqlTool = async (
      apiClient: ApiClient,
      authHeaders: Record<string, string>,
      mode: 'local' | 'task_manager' = 'task_manager'
    ) => {
      mockTitleGeneration(llmProxy, 'Tool run');
      mockAgentToolCall({
        llmProxy,
        toolName: 'platform_core_execute_esql',
        toolArg: { query: `FROM ${restrictedIndex} | LIMIT 1` },
      });
      mockFinalAnswer(llmProxy, 'done');

      const res = await postConverse(
        apiClient,
        authHeaders,
        { agent_id: agentId, input: 'read the index', connector_id: connectorId },
        mode
      );
      expect(res).toHaveStatusCode(200);
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      const { conversation_id: id } = res.body as { conversation_id: string };
      const conversation = await getConversation(apiClient, authHeaders, id);
      const toolStep = conversation.rounds[0].steps.find((step) => step.type === 'tool_call');
      expect(toolStep).toBeDefined();
      return { conversation, toolStep: JSON.stringify(toolStep) };
    };

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
            ...agentBuilderRole('*', ['read']),
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

      // The editor owns the agent, so only manage_security separates it from the binder.
      const created = await apiClient.post(AGENTS_PATH, {
        headers: { ...COMMON_HEADERS, ...asEditor },
        body: {
          id: agentId,
          name: 'Bound agent',
          description: 'Runs as a service account',
          access_control: { access_mode: AgentAccessControlMode.Public },
          configuration: { instructions: 'Answer briefly.', tools: [{ tool_ids: ['*'] }] },
        },
        responseType: 'json',
      });
      expect(created).toHaveStatusCode(200);

      const bound = await updateAgent(apiClient, asBinder, {
        service_account_id: serviceAccount.id,
      });
      expect(bound).toHaveStatusCode(200);
      expect((bound.body as AgentDefinitionWithPermissions).service_account_id).toBe(
        serviceAccount.id
      );
    });

    apiTest.afterAll(async ({ esClient, kbnClient, apiClient }) => {
      llmProxy.close();
      await apiClient.delete(AGENT_PATH(agentId), {
        headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        responseType: 'json',
      });
      await deleteConnectorById(kbnClient, connectorId);
      await deleteAllConversationsFromEs(esClient);
      await deleteServiceAccount(esClient, serviceAccount.name);
      await kbnClient.request({
        method: 'DELETE',
        path: `${SERVICE_ACCOUNTS_PATH}/${encodeURIComponent(serviceAccount.id)}?force=true`,
        headers: adminInternalHeaders(),
        ignoreErrors: [404],
      });
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
      const rebind = await updateAgent(apiClient, asEditor, { service_account_id: 'kibana/other' });
      expect(rebind).toHaveStatusCode(403);

      const unbind = await updateAgent(apiClient, asEditor, { service_account_id: null });
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
      const { toolStep } = await runEsqlTool(apiClient, asEditor, 'local');

      expect(toolStep).toContain(marker);
    });

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
          serviceAccount.authHeader,
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

    apiTest('unbinding restores the caller identity', async ({ apiClient, kbnClient }) => {
      const unbound = await updateAgent(apiClient, asBinder, { service_account_id: null });
      expect(unbound).toHaveStatusCode(200);
      expect((unbound.body as AgentDefinitionWithPermissions).service_account_id).toBeUndefined();
      expect(await boundWorkloads(kbnClient)).not.toContain(agentId);

      await setupAgentDirectAnswer({ proxy: llmProxy, response: 'as yourself' });
      const res = await postConverse(
        apiClient,
        asViewer,
        {
          agent_id: agentId,
          input: 'hello',
          connector_id: connectorId,
          access_control: { access_mode: ConversationAccessControlMode.Private },
        },
        'task_manager'
      );
      expect(res).toHaveStatusCode(200);
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      const { toolStep } = await runEsqlTool(apiClient, asEditor);
      expect(toolStep).not.toContain(marker);
      expect(toolStep).toContain('"type":"error"');
    });
  }
);
