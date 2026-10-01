/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { KbnClient } from '@kbn/kbn-client';
import type { LlmProxy } from '@kbn/ftr-llm-proxy';
import { createLlmProxy, createToolCallMessage } from '@kbn/ftr-llm-proxy';

const COMMON_HEADERS = {
  'kbn-xsrf': 'kibana',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json',
};
const API_AGENT_BUILDER = '/api/agent_builder';

const createGenAiConnectorForProxy = async (
  kbnClient: KbnClient,
  proxy: LlmProxy
): Promise<string> => {
  const res = await kbnClient.request<{ id: string }>({
    method: 'POST',
    path: '/api/actions/connector',
    headers: COMMON_HEADERS,
    body: {
      name: 'llm-proxy',
      config: {
        apiProvider: 'OpenAI',
        apiUrl: `http://localhost:${proxy.getPort()}`,
        defaultModel: 'gpt-4',
      },
      secrets: { apiKey: 'myApiKey' },
      connector_type_id: '.gen-ai',
    },
  });
  return res.data.id;
};

const mockTitleGeneration = (proxy: LlmProxy, title: string) => {
  void proxy
    .intercept({
      name: 'set_title',
      when: ({ messages }) =>
        String(messages.find((m) => m.role === 'system')?.content ?? '').includes(
          'You are a title-generation utility'
        ),
      responseMock: createToolCallMessage('set_title', { title }),
    })
    .completeAfterIntercept();
};

const mockToolCall = (proxy: LlmProxy, toolName: string, toolArg: Record<string, unknown>) => {
  void proxy.interceptors.userMessage({
    name: 'agent:tool_call',
    when: ({ messages }) =>
      !String(messages.find((m) => m.role === 'system')?.content ?? '').includes(
        'You are a title-generation utility'
      ),
    response: createToolCallMessage(toolName, toolArg),
  });
};

const mockFinalAnswer = (proxy: LlmProxy, answer: string) => {
  void proxy
    .intercept({ name: 'final-assistant-response', when: () => true, responseMock: answer })
    .completeAfterIntercept();
};

const CHAT_CONVERSE_ASYNC = '/api/chat/converse/async';

const CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE = 'platform.custom_content.panel_context';
const CUSTOM_CONTENT_UPDATE_TOOL_ID = 'custom_content_update_panel';
const CUSTOM_CONTENT_UPDATED_UI_EVENT = 'custom_content:updated';
const EMBEDDABLE_ID = 'panel-under-test';
const UPDATED_ESQL_QUERY = 'FROM logs-* | STATS count = COUNT(*)';

interface ParsedSseBlock {
  type: string;
  data: {
    data?: {
      conversation_id?: string;
      tool_id?: string;
      custom_event?: string;
      data?: { attachmentId?: string; data?: { embeddable_id?: string; esql_query?: string } };
    };
  };
}

const parseSseBlocks = (streamText: string): ParsedSseBlock[] => {
  const blocks: ParsedSseBlock[] = [];
  for (const block of streamText.split('\n\n')) {
    const lines = block.split('\n');
    const eventType = lines
      .find((line) => line.startsWith('event:'))
      ?.slice('event:'.length)
      .trim();
    const dataLine = lines.find((line) => line.startsWith('data:'));
    if (!eventType || !dataLine) {
      continue;
    }
    try {
      blocks.push({ type: eventType, data: JSON.parse(dataLine.slice('data:'.length).trim()) });
    } catch {
      // Not a JSON data line — skip it.
    }
  }
  return blocks;
};

const getConversationId = (streamText: string): string => {
  for (const block of parseSseBlocks(streamText)) {
    if (block.type !== 'conversation_created' && block.type !== 'conversation_updated') {
      continue;
    }
    if (typeof block.data?.data?.conversation_id === 'string') {
      return block.data.data.conversation_id;
    }
  }
  throw new Error('expected a conversation_id in the SSE stream');
};

/**
 * Integrations such as the dashboard app and the custom content panel apply agent changes from the
 * `tool_ui` events a tool sends via `context.events.sendUiEvent`. This guards the contract they rely
 * on: those events must reach the events-native `/api/chat` stream, which filters other events out.
 */
apiTest.describe(
  'Custom content — Refine with chat tool UI events',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    let adminCredentials: RoleApiCredentials;
    let llmProxy: LlmProxy;
    let connectorId: string;
    const conversationIds: string[] = [];

    apiTest.beforeAll(async ({ requestAuth, log, kbnClient }) => {
      adminCredentials = await requestAuth.getApiKeyForAdmin();
      llmProxy = await createLlmProxy(log);
      connectorId = await createGenAiConnectorForProxy(kbnClient, llmProxy);
    });

    apiTest.afterAll(async ({ apiClient, kbnClient }) => {
      for (const id of conversationIds) {
        await apiClient.delete(`${API_AGENT_BUILDER}/conversations/${encodeURIComponent(id)}`, {
          headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        });
      }
      llmProxy.close();
      await kbnClient.request({
        method: 'DELETE',
        path: `/api/actions/connector/${encodeURIComponent(connectorId)}`,
        headers: COMMON_HEADERS,
      });
    });

    apiTest(
      'a tool UI event sent by custom_content_update_panel reaches the events-native stream',
      async ({ apiClient }) => {
        mockTitleGeneration(llmProxy, 'Tool UI events');
        mockToolCall(llmProxy, CUSTOM_CONTENT_UPDATE_TOOL_ID, {
          embeddable_id: EMBEDDABLE_ID,
          esqlQuery: UPDATED_ESQL_QUERY,
        });
        mockFinalAnswer(llmProxy, 'Panel updated');

        const res = await apiClient.post(CHAT_CONVERSE_ASYNC, {
          headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
          body: {
            input: 'Change the query of this panel',
            connector_id: connectorId,
            _execution_mode: 'local',
            attachments: [
              {
                type: CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
                data: {
                  embeddable_id: EMBEDDABLE_ID,
                  panel_template: '<div>{{ count }}</div>',
                  esql_query: 'FROM logs-* | LIMIT 1',
                },
              },
            ],
          },
          responseType: 'buffer',
        });
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        expect(res).toHaveStatusCode(200);

        const streamText = (res.body as Buffer).toString('utf8');
        conversationIds.push(getConversationId(streamText));

        const uiEvents = parseSseBlocks(streamText).filter(
          ({ type, data }) =>
            type === 'tool_ui' && data?.data?.custom_event === CUSTOM_CONTENT_UPDATED_UI_EVENT
        );
        expect(
          uiEvents,
          `expected one ${CUSTOM_CONTENT_UPDATED_UI_EVENT} tool_ui event`
        ).toHaveLength(1);

        const [{ data: eventPayload }] = uiEvents;
        expect(eventPayload.data).toMatchObject({
          tool_id: CUSTOM_CONTENT_UPDATE_TOOL_ID,
          data: {
            data: { embeddable_id: EMBEDDABLE_ID, esql_query: UPDATED_ESQL_QUERY },
          },
        });
        expect(typeof eventPayload.data?.data?.attachmentId).toBe('string');
      }
    );
  }
);
