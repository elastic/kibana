/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import type { UpdateOriginResponse, VersionedAttachment } from '@kbn/agent-builder-common';
import type {
  CheckStaleAttachmentsResponse,
  CreateAttachmentResponse,
  ListAttachmentsResponse,
} from '../../../../common/http_api/attachments';
import type { ChatResponse } from '../../../../common/http_api/chat';
import type { AuthedApiClient } from '../../../scout_agent_builder_shared/lib/authed_api_client';
import {
  createGenAiConnectorForProxy,
  deleteConnectorById,
} from '../../../scout_agent_builder_shared/lib/connector_kbn';
import { setupAgentDirectAnswer } from '../../../scout_agent_builder_shared/lib/proxy_scenario';
import { apiTest } from '../fixtures';
import { API_AGENT_BUILDER } from '../fixtures/constants';

apiTest.describe(
  'Agent Builder — conversation attachments API',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    let llmProxy: LlmProxy;
    let connectorId: string;
    const createdConversationIds: string[] = [];

    apiTest.beforeAll(async ({ log, kbnClient }) => {
      llmProxy = await createLlmProxy(log);
      const { id } = await createGenAiConnectorForProxy(kbnClient, llmProxy);
      connectorId = id;
    });

    apiTest.afterEach(() => {
      llmProxy.clear();
    });

    apiTest.afterAll(async ({ asAdmin, kbnClient }) => {
      for (const conversationId of createdConversationIds) {
        await asAdmin.delete(
          `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationId)}`
        );
      }
      llmProxy.close();
      await deleteConnectorById(kbnClient, connectorId);
    });

    async function createConversation(asAdmin: AuthedApiClient): Promise<string> {
      await setupAgentDirectAnswer({
        proxy: llmProxy,
        title: 'Test Conversation',
        response: 'Test response',
      });
      const res = await asAdmin.post(`${API_AGENT_BUILDER}/converse`, {
        body: { input: 'Hello', connector_id: connectorId, _execution_mode: 'local' },
        responseType: 'json',
      });
      expect(res).toHaveStatusCode(200);
      const body = res.body as ChatResponse;
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
      createdConversationIds.push(body.conversation_id);
      return body.conversation_id;
    }

    async function createTextAttachment(
      asAdmin: AuthedApiClient,
      conversationId: string
    ): Promise<VersionedAttachment> {
      const response = await asAdmin.post(
        `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationId)}/attachments`,
        {
          body: { type: 'text', data: { content: 'test content' } },
          responseType: 'json',
        }
      );
      expect(response).toHaveStatusCode(200);
      return (response.body as CreateAttachmentResponse).attachment;
    }

    apiTest('PUT origin updates attachment', async ({ asAdmin }) => {
      const conversationId = await createConversation(asAdmin);
      const attachment = await createTextAttachment(asAdmin, conversationId);

      const response = await asAdmin.put(
        `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(
          conversationId
        )}/attachments/${encodeURIComponent(attachment.id)}/origin`,
        {
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

    apiTest('GET list attachments reflects origin', async ({ asAdmin }) => {
      const conversationId = await createConversation(asAdmin);
      const attachment = await createTextAttachment(asAdmin, conversationId);
      await asAdmin.put(
        `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(
          conversationId
        )}/attachments/${encodeURIComponent(attachment.id)}/origin`,
        {
          body: { origin: 'persisted-saved-object-456' },
          responseType: 'json',
        }
      );

      const listResponse = await asAdmin.get(
        `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationId)}/attachments`,
        { responseType: 'json' }
      );
      expect(listResponse).toHaveStatusCode(200);
      const listBody = listResponse.body as ListAttachmentsResponse;
      const updated = listBody.results.find((a) => a.id === attachment.id);
      expect(updated?.origin).toBe('persisted-saved-object-456');
    });

    apiTest('stale check for text without origin', async ({ asAdmin }) => {
      const conversationId = await createConversation(asAdmin);
      const attachment = await createTextAttachment(asAdmin, conversationId);
      const response = await asAdmin.get(
        `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(
          conversationId
        )}/attachments/stale`,
        { responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);
      const body = response.body as CheckStaleAttachmentsResponse;
      const resultsForAttachment = body.attachments.filter((a) => a.id === attachment.id);
      expect(resultsForAttachment).toHaveLength(1);
      expect(resultsForAttachment[0].is_stale).toBe(false);
    });

    apiTest('stale check empty when no attachments', async ({ asAdmin }) => {
      const conversationId = await createConversation(asAdmin);
      const response = await asAdmin.get(
        `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(
          conversationId
        )}/attachments/stale`,
        { responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);
      expect((response.body as CheckStaleAttachmentsResponse).attachments).toStrictEqual([]);
    });
  }
);
