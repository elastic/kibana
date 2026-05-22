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
import {
  createGenAiConnectorForProxy,
  deleteConnectorById,
} from '../../../scout_agent_builder_shared/lib/connector_kbn';
import { setupAgentDirectAnswer } from '../../../scout_agent_builder_shared/lib/proxy_scenario';
import { apiTest } from '../fixtures';
import { API_AGENT_BUILDER } from '../fixtures/constants';
import { getConversation, postConverse, type ExecutionMode } from '../fixtures/converse_http';

const EXECUTION_MODES: ExecutionMode[] = ['local', 'task_manager'];

apiTest.describe(
  'Agent Builder — converse attachments API',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    let adminCredentials: RoleApiCredentials;
    let llmProxy: LlmProxy;
    let connectorId: string;
    const conversationIds: string[] = [];

    apiTest.beforeAll(async ({ requestAuth, log, kbnClient }) => {
      adminCredentials = await requestAuth.getApiKeyForAdmin();
      llmProxy = await createLlmProxy(log);
      const { id } = await createGenAiConnectorForProxy(kbnClient, llmProxy);
      connectorId = id;
    });

    apiTest.afterEach(() => {
      llmProxy.clear();
    });

    apiTest.afterAll(async ({ asAdmin, kbnClient }) => {
      for (const id of conversationIds) {
        await asAdmin.delete(`${API_AGENT_BUILDER}/conversations/${encodeURIComponent(id)}`);
      }
      llmProxy.close();
      await deleteConnectorById(kbnClient, connectorId);
    });

    for (const mode of EXECUTION_MODES) {
      apiTest(`[${mode}] rejects unknown attachment type`, async ({ asAdmin }) => {
        const res = await asAdmin.post(`${API_AGENT_BUILDER}/converse`, {
          body: {
            input: 'Hello AgentBuilder',
            attachments: [{ type: 'unknown', data: { foo: 'bar' } }],
            connector_id: connectorId,
            _execution_mode: mode,
          },
          responseType: 'json',
        });
        expect(res).toHaveStatusCode(400);
        expect(String((res.body as { message?: string }).message)).toContain(
          'Unknown attachment type'
        );
      });

      apiTest(`[${mode}] rejects invalid attachment payload`, async ({ asAdmin }) => {
        const res = await asAdmin.post(`${API_AGENT_BUILDER}/converse`, {
          body: {
            input: 'Hello AgentBuilder',
            attachments: [{ type: 'text', data: {} }],
            connector_id: connectorId,
            _execution_mode: mode,
          },
          responseType: 'json',
        });
        expect(res).toHaveStatusCode(400);
        expect(String((res.body as { message?: string }).message)).toContain(
          'Attachment validation failed'
        );
      });

      apiTest(`[${mode}] accepts data-only text attachment for model`, async ({ apiClient }) => {
        await setupAgentDirectAnswer({
          proxy: llmProxy,
          title: 'Mocked Conversation Title',
          response: 'Mocked LLM response',
        });
        await postConverse(
          apiClient,
          adminCredentials.apiKeyHeader,
          {
            input: 'Hello AgentBuilder',
            attachments: [{ type: 'text', data: { content: 'some text content' } }],
            connector_id: connectorId,
          },
          mode
        );
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
        const firstAgentRequest = llmProxy.interceptedRequests.find(
          (request) => request.matchingInterceptorName === 'handover-to-answer'
        )?.requestBody;
        expect(firstAgentRequest).toBeDefined();
        const allMessageContent = firstAgentRequest!.messages
          .map((m: { content?: unknown }) => String(m.content ?? ''))
          .join('\n');
        expect(allMessageContent).toContain('some text content');
      });

      apiTest(`[${mode}] rejects attachment without data or origin`, async ({ asAdmin }) => {
        const res = await asAdmin.post(`${API_AGENT_BUILDER}/converse`, {
          body: {
            input: 'Hello AgentBuilder',
            attachments: [{ type: 'text' }],
            connector_id: connectorId,
            _execution_mode: mode,
          },
          responseType: 'json',
        });
        expect(res).toHaveStatusCode(400);
        expect(String((res.body as { message?: string }).message)).toContain(
          'either data or origin'
        );
      });

      apiTest(`[${mode}] rejects origin-only for text attachments`, async ({ asAdmin }) => {
        const res = await asAdmin.post(`${API_AGENT_BUILDER}/converse`, {
          body: {
            input: 'Hello AgentBuilder',
            attachments: [{ type: 'text', origin: 'some-origin-id' }],
            connector_id: connectorId,
            _execution_mode: mode,
          },
          responseType: 'json',
        });
        expect(res).toHaveStatusCode(400);
        expect(String((res.body as { message?: string }).message)).toContain(
          'does not support resolving from origin'
        );
      });

      apiTest(
        `[${mode}] prefers inline data when both data and origin provided`,
        async ({ apiClient }) => {
          await setupAgentDirectAnswer({
            proxy: llmProxy,
            title: 'Mocked Conversation Title',
            response: 'Mocked LLM response',
          });
          await postConverse(
            apiClient,
            adminCredentials.apiKeyHeader,
            {
              input: 'Hello AgentBuilder',
              attachments: [
                {
                  type: 'text',
                  origin: 'ignored-origin-id',
                  data: { content: 'inline-payload-for-model' },
                },
              ],
              connector_id: connectorId,
            },
            mode
          );
          await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
          const firstAgentRequest = llmProxy.interceptedRequests.find(
            (request) => request.matchingInterceptorName === 'handover-to-answer'
          )?.requestBody;
          expect(firstAgentRequest).toBeDefined();
          const allMessageContent = firstAgentRequest!.messages
            .map((m: { content?: unknown }) => String(m.content ?? ''))
            .join('\n');
          expect(allMessageContent).toContain('inline-payload-for-model');
        }
      );

      apiTest(`[${mode}] persists conversation-level attachments`, async ({ apiClient }) => {
        await setupAgentDirectAnswer({
          proxy: llmProxy,
          title: 'Mocked Conversation Title',
          response: 'Mocked LLM response',
        });
        const res = await postConverse(
          apiClient,
          adminCredentials.apiKeyHeader,
          {
            input: 'Hello AgentBuilder',
            attachments: [{ type: 'text', data: { content: 'some text content' } }],
            connector_id: connectorId,
          },
          mode
        );
        expect(res).toHaveStatusCode(200);
        const conversationId = (res.body as { conversation_id: string }).conversation_id;
        conversationIds.push(conversationId);
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        const conversation = await getConversation(
          apiClient,
          adminCredentials.apiKeyHeader,
          conversationId
        );
        expect(conversation.rounds).toHaveLength(1);
        expect(conversation.rounds[0].input.attachments ?? []).toStrictEqual([]);
        expect(conversation.attachments?.length).toBe(1);
        expect(conversation.attachments?.[0].type).toBe('text');
        expect(conversation.attachments?.[0].current_version).toBe(1);
        expect(conversation.attachments?.[0].versions[0].data).toStrictEqual({
          content: 'some text content',
        });
      });
    }
  }
);
