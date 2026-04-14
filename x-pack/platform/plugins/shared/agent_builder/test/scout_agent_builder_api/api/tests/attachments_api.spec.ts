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
import type { VersionedAttachment } from '@kbn/agent-builder-common';
import type {
  CheckStaleAttachmentsResponse,
  CreateAttachmentResponse,
  ListAttachmentsResponse,
  UpdateOriginResponse,
} from '../../../../common/http_api/attachments';
import type { ChatResponse } from '../../../../common/http_api/chat';
import {
  createGenAiConnectorForProxy,
  deleteConnectorById,
} from '../../../scout_agent_builder_shared/lib/connector_kbn';
import { setupAgentDirectAnswer } from '../../../scout_agent_builder_shared/lib/proxy_scenario';
import { apiTest } from '../fixtures';
import { API_AGENT_BUILDER, COMMON_HEADERS } from '../fixtures/constants';
import { postConverse, type ScoutAgentBuilderApiClient } from '../fixtures/converse_http';

apiTest.describe(
  'Agent Builder — conversation attachments API',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let adminCredentials: RoleApiCredentials;
    let llmProxy: LlmProxy;
    let connectorId: string;
    const createdConversationIds: string[] = [];

    apiTest.beforeAll(async ({ requestAuth, log, kbnClient }) => {
      adminCredentials = await requestAuth.getApiKeyForAdmin();
      llmProxy = await createLlmProxy(log);
      const { id } = await createGenAiConnectorForProxy(kbnClient, llmProxy);
      connectorId = id;
    });

    apiTest.afterEach(() => {
      llmProxy.clear();
    });

    apiTest.afterAll(async ({ apiClient, kbnClient }) => {
      for (const conversationId of createdConversationIds) {
        await apiClient.delete(
          `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationId)}`,
          { headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader } }
        );
      }
      llmProxy.close();
      await deleteConnectorById(kbnClient, connectorId);
    });

    const h = () => ({ ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader });

    async function createConversation(apiClient: ScoutAgentBuilderApiClient): Promise<string> {
      await setupAgentDirectAnswer({
        proxy: llmProxy,
        title: 'Test Conversation',
        response: 'Test response',
      });
      const res = await postConverse(
        apiClient,
        adminCredentials.apiKeyHeader,
        { input: 'Hello', connector_id: connectorId },
        'local'
      );
      expect(res).toHaveStatusCode(200);
      const body = res.body as ChatResponse;
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
      createdConversationIds.push(body.conversation_id);
      return body.conversation_id;
    }

    async function createTextAttachment(
      apiClient: ScoutAgentBuilderApiClient,
      conversationId: string
    ): Promise<VersionedAttachment> {
      const response = await apiClient.post(
        `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationId)}/attachments`,
        {
          headers: h(),
          body: { type: 'text', data: { content: 'test content' } },
          responseType: 'json',
        }
      );
      expect(response).toHaveStatusCode(200);
      return (response.body as CreateAttachmentResponse).attachment;
    }

    apiTest('PUT origin updates attachment', async ({ apiClient }) => {
      const conversationId = await createConversation(apiClient);
      const attachment = await createTextAttachment(apiClient, conversationId);

      const response = await apiClient.put(
        `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(
          conversationId
        )}/attachments/${encodeURIComponent(attachment.id)}/origin`,
        {
          headers: h(),
          body: { origin: 'saved-object-123' },
          responseType: 'json',
        }
      );
      expect(response).toHaveStatusCode(200);
      const body = response.body as UpdateOriginResponse;
      expect(body.success).toBe(true);
      expect(body.attachment.id).toBe(attachment.id);
      expect(body.attachment.origin).toBe('saved-object-123');
    });

    apiTest('GET list attachments reflects origin', async ({ apiClient }) => {
      const conversationId = await createConversation(apiClient);
      const attachment = await createTextAttachment(apiClient, conversationId);
      await apiClient.put(
        `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(
          conversationId
        )}/attachments/${encodeURIComponent(attachment.id)}/origin`,
        {
          headers: h(),
          body: { origin: 'persisted-saved-object-456' },
          responseType: 'json',
        }
      );

      const listResponse = await apiClient.get(
        `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationId)}/attachments`,
        { headers: h(), responseType: 'json' }
      );
      expect(listResponse).toHaveStatusCode(200);
      const listBody = listResponse.body as ListAttachmentsResponse;
      const updated = listBody.results.find((a) => a.id === attachment.id);
      expect(updated?.origin).toBe('persisted-saved-object-456');
    });

    apiTest('stale check for text without origin', async ({ apiClient }) => {
      const conversationId = await createConversation(apiClient);
      const attachment = await createTextAttachment(apiClient, conversationId);
      const response = await apiClient.get(
        `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(
          conversationId
        )}/attachments/stale`,
        { headers: h(), responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);
      const body = response.body as CheckStaleAttachmentsResponse;
      const resultsForAttachment = body.attachments.filter((a) => a.id === attachment.id);
      expect(resultsForAttachment).toHaveLength(1);
      expect(resultsForAttachment[0].is_stale).toBe(false);
    });

    apiTest('stale check empty when no attachments', async ({ apiClient }) => {
      const conversationId = await createConversation(apiClient);
      const response = await apiClient.get(
        `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(
          conversationId
        )}/attachments/stale`,
        { headers: h(), responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);
      expect((response.body as CheckStaleAttachmentsResponse).attachments).toStrictEqual([]);
    });
  }
);
