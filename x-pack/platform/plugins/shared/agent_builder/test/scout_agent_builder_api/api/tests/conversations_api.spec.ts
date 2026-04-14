/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation, ConversationWithoutRounds } from '@kbn/agent-builder-common';
import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import type { ChatResponse } from '../../../../common/http_api/chat';
import type {
  DeleteConversationResponse,
  ListConversationsResponse,
} from '../../../../common/http_api/conversations';
import {
  createGenAiConnectorForProxy,
  deleteConnectorById,
} from '../../../scout_agent_builder_shared/lib/connector_kbn';
import { setupAgentDirectAnswer } from '../../../scout_agent_builder_shared/lib/proxy_scenario';
import { apiTest } from '../fixtures';
import { API_AGENT_BUILDER, CHAT_CONVERSATIONS_INDEX, COMMON_HEADERS } from '../fixtures/constants';
import { postConverse, type ScoutAgentBuilderApiClient } from '../fixtures/converse_http';

apiTest.describe(
  'Agent Builder — conversations API',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let adminCredentials: RoleApiCredentials;
    let llmProxy: LlmProxy;
    let connectorId: string;
    const createdConversationIds: string[] = [];
    let conversationApiClient: ScoutAgentBuilderApiClient;

    apiTest.beforeAll(async ({ requestAuth, log, kbnClient }) => {
      adminCredentials = await requestAuth.getApiKeyForAdmin();
      llmProxy = await createLlmProxy(log);
      const { id } = await createGenAiConnectorForProxy(kbnClient, llmProxy);
      connectorId = id;
    });

    apiTest.beforeEach(async ({ apiClient }) => {
      conversationApiClient = apiClient;
    });

    apiTest.afterAll(async ({ apiClient, kbnClient, esClient }) => {
      for (const conversationId of createdConversationIds) {
        await apiClient.delete(
          `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationId)}`,
          { headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader }, responseType: 'json' }
        );
      }
      llmProxy.close();
      await deleteConnectorById(kbnClient, connectorId);
      await esClient.deleteByQuery({
        index: CHAT_CONVERSATIONS_INDEX,
        query: { match_all: {} },
        wait_for_completion: true,
        refresh: true,
        conflicts: 'proceed',
        ignore_unavailable: true,
      });
    });

    async function createConversation(input: string, title: string): Promise<string> {
      await setupAgentDirectAnswer({
        proxy: llmProxy,
        title,
        response: `Response to: ${input}`,
      });
      const res = await postConverse(
        conversationApiClient,
        adminCredentials.apiKeyHeader,
        { input, connector_id: connectorId },
        'local'
      );
      expect(res).toHaveStatusCode(200);
      const body = res.body as ChatResponse;
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
      createdConversationIds.push(body.conversation_id);
      return body.conversation_id;
    }

    function removeTrackedConversationId(conversationId: string): void {
      const index = createdConversationIds.indexOf(conversationId);
      if (index > -1) {
        createdConversationIds.splice(index, 1);
      }
    }

    apiTest('GET /conversations lists conversations with expected shape', async ({ apiClient }) => {
      for (let i = 0; i < 3; i++) {
        await createConversation(`Test message ${i}`, `Test Conversation ${i}`);
      }
      const response = await apiClient.get(`${API_AGENT_BUILDER}/conversations`, {
        headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body).toHaveProperty('results');
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.results.length).toBeGreaterThan(0);
      const conversation = response.body.results[0] as ConversationWithoutRounds;
      expect(conversation).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        agent_id: expect.any(String),
        user: expect.anything(),
        created_at: expect.anything(),
        updated_at: expect.anything(),
      });
      expect(conversation).not.toHaveProperty('rounds');
    });

    apiTest('GET /conversations includes created conversations', async ({ apiClient }) => {
      const testConversationIds: string[] = [];
      for (let i = 0; i < 3; i++) {
        testConversationIds.push(
          await createConversation(`Verify message ${i}`, `Verify Conversation ${i}`)
        );
      }
      const response = await apiClient.get(`${API_AGENT_BUILDER}/conversations`, {
        headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      const body = response.body as ListConversationsResponse;
      const conversationIds = body.results.map((c) => c.id);
      for (const testId of testConversationIds) {
        expect(conversationIds).toContain(testId);
      }
    });

    apiTest('GET /conversations filters by agent_id', async ({ apiClient }) => {
      const conversationId = await createConversation('Agent filter test', 'Agent Filter Test');
      const conversationRes = await apiClient.get(
        `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationId)}`,
        { headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader }, responseType: 'json' }
      );
      expect(conversationRes).toHaveStatusCode(200);
      const agentId = (conversationRes.body as Conversation).agent_id;

      const response = await apiClient.get(
        `${API_AGENT_BUILDER}/conversations?${new URLSearchParams({ agent_id: agentId })}`,
        {
          headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
          responseType: 'json',
        }
      );
      expect(response).toHaveStatusCode(200);
      const body = response.body as ListConversationsResponse;
      for (const conv of body.results) {
        expect(conv.agent_id).toBe(agentId);
      }
    });

    apiTest(
      'GET /conversations returns empty when filtering unknown agent_id',
      async ({ apiClient }) => {
        const response = await apiClient.get(
          `${API_AGENT_BUILDER}/conversations?${new URLSearchParams({
            agent_id: 'non-existent-agent-id',
          })}`,
          {
            headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
            responseType: 'json',
          }
        );
        expect(response).toHaveStatusCode(200);
        const body = response.body as ListConversationsResponse;
        expect(body.results).toStrictEqual([]);
      }
    );

    apiTest('GET /conversations/:id returns conversation with rounds', async ({ apiClient }) => {
      const testInput = 'Test message for get endpoint';
      const testTitle = 'Get Test Conversation';
      const testConversationId = await createConversation(testInput, testTitle);

      const response = await apiClient.get(
        `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(testConversationId)}`,
        { headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader }, responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);
      const conversation = response.body as Conversation;
      expect(conversation.id).toBe(testConversationId);
      expect(conversation.title).toBe(testTitle);
      expect(conversation.user).toStrictEqual(expect.any(Object));
      expect(conversation.rounds.length).toBeGreaterThan(0);
    });

    apiTest('GET /conversations/:id includes round messages', async ({ apiClient }) => {
      const testConversationId = await createConversation(
        'Test message for get endpoint',
        'Get Test Conversation'
      );
      const response = await apiClient.get(
        `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(testConversationId)}`,
        {
          headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
          responseType: 'json',
        }
      );
      expect(response).toHaveStatusCode(200);
      const conversation = response.body as Conversation;
      const firstRound = conversation.rounds[0];
      expect(firstRound.input).toHaveProperty('message');
      expect(firstRound.response).toHaveProperty('message');
      expect(Array.isArray(firstRound.steps)).toBe(true);
    });

    apiTest('GET /conversations/:id returns 404 for missing id', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${API_AGENT_BUILDER}/conversations/non-existent-conversation-id-12345`,
        { headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader }, responseType: 'json' }
      );
      expect(response).toHaveStatusCode(404);
      expect(String((response.body as { message?: string }).message)).toContain('not found');
    });

    apiTest('DELETE /conversations/:id deletes then GET 404', async ({ apiClient }) => {
      const conversationToDelete = await createConversation(
        'Message for delete test',
        'Delete Test Conversation'
      );
      const del = await apiClient.delete(
        `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationToDelete)}`,
        { headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader }, responseType: 'json' }
      );
      expect(del).toHaveStatusCode(200);
      expect((del.body as DeleteConversationResponse).success).toBe(true);
      const getRes = await apiClient.get(
        `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationToDelete)}`,
        { headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader }, responseType: 'json' }
      );
      expect(getRes).toHaveStatusCode(404);
      removeTrackedConversationId(conversationToDelete);
    });

    apiTest('DELETE /conversations/:id returns 404 when missing', async ({ apiClient }) => {
      const response = await apiClient.delete(
        `${API_AGENT_BUILDER}/conversations/non-existent-conversation-to-delete`,
        { headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader }, responseType: 'json' }
      );
      expect(response).toHaveStatusCode(404);
      expect(String((response.body as { message?: string }).message)).toContain('not found');
    });

    apiTest('DELETE cannot delete same conversation twice', async ({ apiClient }) => {
      const conversationToDelete = await createConversation(
        'Message for double delete',
        'Double Delete Conversation'
      );
      const first = await apiClient.delete(
        `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationToDelete)}`,
        { headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader }, responseType: 'json' }
      );
      expect(first).toHaveStatusCode(200);
      const second = await apiClient.delete(
        `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationToDelete)}`,
        { headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader }, responseType: 'json' }
      );
      expect(second).toHaveStatusCode(404);
      removeTrackedConversationId(conversationToDelete);
    });

    apiTest('conversation lifecycle: create, list, get, delete', async ({ apiClient }) => {
      const testTitle = 'Lifecycle Test Conversation';
      const conversationId = await createConversation('Lifecycle test message', testTitle);

      const list1 = await apiClient.get(`${API_AGENT_BUILDER}/conversations`, {
        headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        responseType: 'json',
      });
      expect(list1).toHaveStatusCode(200);
      let ids = (list1.body as ListConversationsResponse).results.map((c) => c.id);
      expect(ids).toContain(conversationId);

      const getRes = await apiClient.get(
        `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationId)}`,
        { headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader }, responseType: 'json' }
      );
      expect(getRes).toHaveStatusCode(200);
      expect((getRes.body as Conversation).title).toBe(testTitle);

      await apiClient.delete(
        `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationId)}`,
        { headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader }, responseType: 'json' }
      );

      const list2 = await apiClient.get(`${API_AGENT_BUILDER}/conversations`, {
        headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        responseType: 'json',
      });
      expect(list2).toHaveStatusCode(200);
      ids = (list2.body as ListConversationsResponse).results.map((c) => c.id);
      expect(ids).not.toContain(conversationId);

      const get404 = await apiClient.get(
        `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationId)}`,
        { headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader }, responseType: 'json' }
      );
      expect(get404).toHaveStatusCode(404);
      removeTrackedConversationId(conversationId);
    });
  }
);
