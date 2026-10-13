/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import type {
  AttachmentTimelineEvent,
  Conversation,
  UpdateOriginResponse,
  VersionedAttachment,
} from '@kbn/agent-builder-common';
import { isAttachmentEvent } from '@kbn/agent-builder-common';
import type {
  CheckStaleAttachmentsResponse,
  CreateAttachmentResponse,
  ListAttachmentsResponse,
} from '../../../../../common/http_api/attachments';
import type { ChatResponse } from '../../../../../common/http_api/chat';
import type { AuthedApiClient } from '../../../../scout_agent_builder_shared/lib/authed_api_client';
import {
  createGenAiConnectorForProxy,
  deleteConnectorById,
} from '../../../../scout_agent_builder_shared/lib/connector_kbn';
import { setupAgentDirectAnswer } from '../../../../scout_agent_builder_shared/lib/proxy_scenario';
import { apiTest, API_AGENT_BUILDER } from '../fixtures';

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

    async function getAttachmentEvents(
      asAdmin: AuthedApiClient,
      conversationId: string
    ): Promise<AttachmentTimelineEvent[]> {
      const res = await asAdmin.get(
        `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationId)}`,
        { responseType: 'json' }
      );
      expect(res).toHaveStatusCode(200);
      return ((res.body as Conversation).events ?? []).filter(isAttachmentEvent);
    }

    function attachmentUrl(conversationId: string, attachmentId: string) {
      return `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(
        conversationId
      )}/attachments/${encodeURIComponent(attachmentId)}`;
    }

    apiTest('POST attachment persists an attachment_added event', async ({ asAdmin }) => {
      const conversationId = await createConversation(asAdmin);
      const response = await asAdmin.post(
        `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationId)}/attachments`,
        {
          body: { type: 'text', data: { content: 'inline me' }, render_inline: true },
          responseType: 'json',
        }
      );
      expect(response).toHaveStatusCode(200);
      const { attachment } = response.body as CreateAttachmentResponse;

      const events = await getAttachmentEvents(asAdmin, conversationId);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('attachment_added');
      expect(events[0].actor.type).toBe('user');
      expect(events[0].data).toStrictEqual({
        attachment_id: attachment.id,
        attachment_type: 'text',
        current_version: 1,
        render_inline: true,
        source: 'http_api',
      });
    });

    apiTest('PUT with new content persists an attachment_updated event', async ({ asAdmin }) => {
      const conversationId = await createConversation(asAdmin);
      const attachment = await createTextAttachment(asAdmin, conversationId);

      const response = await asAdmin.put(attachmentUrl(conversationId, attachment.id), {
        body: { data: { content: 'changed content' } },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);

      const events = await getAttachmentEvents(asAdmin, conversationId);
      expect(events.map((e) => e.type)).toStrictEqual(['attachment_added', 'attachment_updated']);
      expect(events[1].data).toStrictEqual({
        attachment_id: attachment.id,
        attachment_type: 'text',
        previous_version: 1,
        current_version: 2,
        render_inline: false,
        source: 'http_api',
      });
    });

    apiTest('PUT with unchanged content persists no additional event', async ({ asAdmin }) => {
      const conversationId = await createConversation(asAdmin);
      const attachment = await createTextAttachment(asAdmin, conversationId);

      const response = await asAdmin.put(attachmentUrl(conversationId, attachment.id), {
        body: { data: { content: 'test content' }, description: 'renamed only' },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);

      const events = await getAttachmentEvents(asAdmin, conversationId);
      expect(events.map((e) => e.type)).toStrictEqual(['attachment_added']);
    });

    apiTest(
      'DELETE persists an attachment_deleted event with hard_delete=false',
      async ({ asAdmin }) => {
        const conversationId = await createConversation(asAdmin);
        const attachment = await createTextAttachment(asAdmin, conversationId);

        const response = await asAdmin.delete(attachmentUrl(conversationId, attachment.id), {
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);

        const events = await getAttachmentEvents(asAdmin, conversationId);
        expect(events.map((e) => e.type)).toStrictEqual(['attachment_added', 'attachment_deleted']);
        expect(events[1].data).toStrictEqual({
          attachment_id: attachment.id,
          attachment_type: 'text',
          hard_delete: false,
          source: 'http_api',
        });
      }
    );

    apiTest(
      'DELETE ?permanent=true removes the attachment and persists hard_delete=true',
      async ({ asAdmin }) => {
        const conversationId = await createConversation(asAdmin);
        const attachment = await createTextAttachment(asAdmin, conversationId);

        const response = await asAdmin.delete(
          `${attachmentUrl(conversationId, attachment.id)}?permanent=true`,
          { responseType: 'json' }
        );
        expect(response).toHaveStatusCode(200);

        const listResponse = await asAdmin.get(
          `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(
            conversationId
          )}/attachments?include_deleted=true`,
          { responseType: 'json' }
        );
        expect(listResponse).toHaveStatusCode(200);
        expect(
          (listResponse.body as ListAttachmentsResponse).results.find((a) => a.id === attachment.id)
        ).toBeUndefined();

        const events = await getAttachmentEvents(asAdmin, conversationId);
        expect(events.map((e) => e.type)).toStrictEqual(['attachment_added', 'attachment_deleted']);
        expect(events[1].data).toStrictEqual({
          attachment_id: attachment.id,
          attachment_type: 'text',
          hard_delete: true,
          source: 'http_api',
        });
      }
    );
  }
);
