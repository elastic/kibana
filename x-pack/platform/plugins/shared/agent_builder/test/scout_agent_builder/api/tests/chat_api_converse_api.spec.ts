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
  ChatEventType,
  CONVERSATION_SCHEMA_VERSION,
  TimelineEventType,
} from '@kbn/agent-builder-common';
import {
  createGenAiConnectorForProxy,
  deleteConnectorById,
} from '../../../scout_agent_builder_shared/lib/connector_kbn';
import { setupAgentDirectAnswer } from '../../../scout_agent_builder_shared/lib/proxy_scenario';
import type { GetConversationResponse } from '../../../../common/http_api/conversations';
import { chatApiPath } from '../../../../common/constants';
import { apiTest } from '../fixtures';
import { API_AGENT_BUILDER, COMMON_HEADERS } from '../fixtures/constants';
import { getConversation, type ScoutAgentBuilderApiClient } from '../fixtures/converse_http';

const CHAT_CONVERSE = `${chatApiPath}/converse`;
const CHAT_CONVERSE_ASYNC = `${chatApiPath}/converse/async`;

// The three events every completed round projects to, in stored order.
const ROUND_DERIVED_EVENT_TYPES = [
  TimelineEventType.userMessage,
  TimelineEventType.executionStarted,
  TimelineEventType.executionTerminated,
];

interface ParsedSseBlock {
  type: string;
  data: any;
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

/**
 * Rebuilds the full event from an SSE block. The server moves `type` onto the SSE `event:` line and
 * serializes the rest as `data:`, and the SSE client re-attaches it as `{ type, ...data }` — mirror
 * that so parsed blocks can be compared against persisted timeline events.
 */
const sseBlockToEvent = (block: ParsedSseBlock): unknown => ({ type: block.type, ...block.data });

/** The text of a model message, whose content is either a string or a list of parts. */
const promptText = ({ content }: { content?: unknown }): string => {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) =>
        typeof part === 'string' ? part : String((part as { text?: string }).text ?? '')
      )
      .join('\n');
  }

  return '';
};

const conversationIdFromSseStream = (streamText: string): string | undefined => {
  for (const block of parseSseBlocks(streamText)) {
    if (
      block.type !== ChatEventType.conversationCreated &&
      block.type !== ChatEventType.conversationUpdated
    ) {
      continue;
    }
    if (typeof block.data?.data?.conversation_id === 'string') {
      return block.data.data.conversation_id;
    }
  }
  return undefined;
};

const postChatConverse = (
  apiClient: ScoutAgentBuilderApiClient,
  authHeaders: Record<string, string>,
  payload: { input: string; connector_id: string; conversation_id?: string }
) =>
  apiClient.post(CHAT_CONVERSE, {
    headers: { ...COMMON_HEADERS, ...authHeaders },
    body: { ...payload, _execution_mode: 'local' },
    responseType: 'json',
  });

/**
 * The events-native `/api/chat` converse surface. It runs the same execution service as the legacy
 * `/api/agent_builder/converse`, so we assert only the delta: the response is the conversation with
 * its `events` timeline. These routes are public and not gated on the `agentBuilder:experimentalFeatures`
 * setting, so they are reachable regardless of the Scout server config.
 */
apiTest.describe(
  'Agent Builder — chat API converse (/api/chat)',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    let adminCredentials: RoleApiCredentials;
    let llmProxy: LlmProxy;
    let connectorId: string;
    const conversationIds: string[] = [];

    apiTest.beforeAll(async ({ requestAuth, log, kbnClient }) => {
      adminCredentials = await requestAuth.getApiKeyForAdmin();
      llmProxy = await createLlmProxy(log);
      ({ id: connectorId } = await createGenAiConnectorForProxy(kbnClient, llmProxy));
    });

    apiTest.afterAll(async ({ asAdmin, kbnClient }) => {
      for (const id of conversationIds) {
        await asAdmin.delete(`${API_AGENT_BUILDER}/conversations/${encodeURIComponent(id)}`);
      }
      llmProxy.close();
      await deleteConnectorById(kbnClient, connectorId);
    });

    apiTest(
      'user message sync requests persist context for the next model request',
      async ({ apiClient }) => {
        const requestsBefore = llmProxy.interceptedRequests.length;
        const headers = { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader };

        await apiTest.step('a user message without a conversation is rejected', async () => {
          const orphan = await apiClient.post(CHAT_CONVERSE, {
            headers,
            body: { trigger_mode: 'never', input: 'Pool limit is now 200' },
            responseType: 'json',
          });
          expect(orphan).toHaveStatusCode(400);
        });

        const conversationId = await apiTest.step('create an empty conversation', async () => {
          const created = await apiClient.post(`${API_AGENT_BUILDER}/conversations`, {
            headers,
            body: { title: 'Incident 4821' },
            responseType: 'json',
          });
          expect(created).toHaveStatusCode(200);
          const id = (created.body as GetConversationResponse).id;
          conversationIds.push(id);

          return id;
        });

        const firstMessageId = await apiTest.step(
          'append two user messages without triggering the agent',
          async () => {
            const first = await apiClient.post(CHAT_CONVERSE, {
              headers,
              body: {
                trigger_mode: 'never',
                conversation_id: conversationId,
                input: 'Pool limit is now 200',
              },
              responseType: 'json',
            });
            expect(first).toHaveStatusCode(200);

            const second = await apiClient.post(CHAT_CONVERSE, {
              headers,
              body: {
                trigger_mode: 'never',
                conversation_id: conversationId,
                input: 'Errors returned to normal',
              },
              responseType: 'json',
            });
            expect(second).toHaveStatusCode(200);

            return (first.body as GetConversationResponse).events?.[0].id;
          }
        );

        await apiTest.step(
          'both are stored as events, with no round and no model call',
          async () => {
            const stored = await getConversation(
              apiClient,
              adminCredentials.apiKeyHeader,
              conversationId
            );
            expect(stored.rounds).toStrictEqual([]);
            expect(stored.events).toHaveLength(2);
            expect(stored.events?.[0].id).toBe(firstMessageId);
            expect(
              stored.events?.every((event) => event.type === TimelineEventType.userMessage)
            ).toBe(true);
            expect(llmProxy.interceptedRequests).toHaveLength(requestsBefore);
          }
        );

        await apiTest.step('the next execution sees them, in order', async () => {
          await setupAgentDirectAnswer({
            proxy: llmProxy,
            response: 'Incident mitigated',
            continueConversation: true,
          });
          const executed = await postChatConverse(apiClient, adminCredentials.apiKeyHeader, {
            conversation_id: conversationId,
            input: 'Summarize the incident',
            connector_id: connectorId,
          });
          expect(executed).toHaveStatusCode(200);
          await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

          const modelRequest = llmProxy.interceptedRequests
            .slice(requestsBefore)
            .find(
              (entry) => entry.matchingInterceptorName === 'final-assistant-response'
            )?.requestBody;
          expect(modelRequest).toBeDefined();

          // Consecutive human turns reach the model as one message whose content is a list of
          // parts, so flatten everything into the prompt text before asserting on it.
          const prompt = (modelRequest?.messages ?? []).map(promptText).join('\n');

          for (const text of [
            'Pool limit is now 200',
            'Errors returned to normal',
            'Summarize the incident',
          ]) {
            expect(prompt.split(text)).toHaveLength(2);
          }

          expect(prompt.indexOf('Pool limit is now 200')).toBeLessThan(
            prompt.indexOf('Errors returned to normal')
          );
          expect(prompt.indexOf('Errors returned to normal')).toBeLessThan(
            prompt.indexOf('Summarize the incident')
          );
          // Each appended message keeps its author attribution.
          expect(prompt).toMatch(/\[User: [^\]]+ — Sent: [^\]]+\]\n\nPool limit is now 200/);
        });

        await apiTest.step('the executed round joins the same timeline', async () => {
          expect(
            (
              await getConversation(apiClient, adminCredentials.apiKeyHeader, conversationId)
            ).events?.filter((event) => event.type === TimelineEventType.userMessage)
          ).toHaveLength(3);
        });
      }
    );

    apiTest('converse returns the conversation with its events timeline', async ({ apiClient }) => {
      const MOCKED_LLM_RESPONSE = 'ack from chat api';
      const MOCKED_LLM_TITLE = 'Chat API Title';
      await setupAgentDirectAnswer({
        proxy: llmProxy,
        title: MOCKED_LLM_TITLE,
        response: MOCKED_LLM_RESPONSE,
      });

      const res = await postChatConverse(apiClient, adminCredentials.apiKeyHeader, {
        input: 'hello chat api',
        connector_id: connectorId,
      });
      expect(res).toHaveStatusCode(200);
      const body = res.body as GetConversationResponse;
      conversationIds.push(body.id);
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      // The response is the conversation (events-forward), not a round-shaped payload.
      expect(body.title).toBe(MOCKED_LLM_TITLE);
      expect(body.schema_version).toBe(CONVERSATION_SCHEMA_VERSION);
      expect((body.events ?? []).map((event) => event.type)).toStrictEqual(
        ROUND_DERIVED_EVENT_TYPES
      );
      expect(body.rounds[0].response.message).toBe(MOCKED_LLM_RESPONSE);

      // The same timeline is served by the existing conversation GET.
      const fetched = await getConversation(apiClient, adminCredentials.apiKeyHeader, body.id);
      expect(fetched.events).toStrictEqual(body.events);
    });

    apiTest('multi-round converse accumulates the timeline', async ({ apiClient }) => {
      await setupAgentDirectAnswer({
        proxy: llmProxy,
        title: 'Chat API Multi',
        response: 'first',
      });
      const first = await postChatConverse(apiClient, adminCredentials.apiKeyHeader, {
        input: 'first message',
        connector_id: connectorId,
      });
      expect(first).toHaveStatusCode(200);
      const conversationId = (first.body as GetConversationResponse).id;
      conversationIds.push(conversationId);
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      await setupAgentDirectAnswer({
        proxy: llmProxy,
        continueConversation: true,
        response: 'second',
      });
      const second = await postChatConverse(apiClient, adminCredentials.apiKeyHeader, {
        input: 'second message',
        connector_id: connectorId,
        conversation_id: conversationId,
      });
      expect(second).toHaveStatusCode(200);
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      const body = second.body as GetConversationResponse;
      expect(body.rounds).toHaveLength(2);
      // Two completed rounds project to two event trios.
      expect(body.events).toHaveLength(ROUND_DERIVED_EVENT_TYPES.length * 2);
    });

    apiTest('streaming converse responds with an event stream', async ({ apiClient }) => {
      const MOCKED_LLM_RESPONSE = 'streamed ack';
      await setupAgentDirectAnswer({
        proxy: llmProxy,
        title: 'Chat API Stream',
        response: MOCKED_LLM_RESPONSE,
      });

      const res = await apiClient.post(CHAT_CONVERSE_ASYNC, {
        headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        body: { input: 'stream please', connector_id: connectorId, _execution_mode: 'local' },
        responseType: 'buffer',
      });
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      expect(res).toHaveStatusCode(200);
      expect(String(res.headers['content-type'])).toContain('text/event-stream');

      const streamText = (res.body as Buffer).toString('utf8');
      expect(streamText).toContain(MOCKED_LLM_RESPONSE);

      // Track the conversation for cleanup, and fail loudly (not silently leak) if the SSE format
      // ever shifts so this stops finding the id.
      const conversationId = conversationIdFromSseStream(streamText);
      expect(conversationId, 'expected a conversation_id in the SSE stream').toBeDefined();
      conversationIds.push(conversationId!);

      // The events-native surface exposes execution_started + execution_terminated and drops
      // round_complete.
      const blocks = parseSseBlocks(streamText);
      const startedIndex = blocks.findIndex(
        (block) => block.type === TimelineEventType.executionStarted
      );
      const terminatedIndex = blocks.findIndex(
        (block) => block.type === TimelineEventType.executionTerminated
      );
      expect(startedIndex, 'expected an execution_started block').toBeGreaterThanOrEqual(0);
      expect(terminatedIndex, 'expected an execution_terminated block').toBeGreaterThanOrEqual(0);
      expect(
        blocks.some((block) => block.type === ChatEventType.roundComplete),
        'events-native stream must not include round_complete'
      ).toBe(false);

      // execution_started must arrive at the start of the run — before any streaming chunks —
      // and execution_terminated must arrive after the final message_complete, matching the
      // real chronological order of the run.
      const firstMessageChunkIndex = blocks.findIndex(
        (block) => block.type === ChatEventType.messageChunk
      );
      const messageCompleteIndex = blocks.findIndex(
        (block) => block.type === ChatEventType.messageComplete
      );
      expect(firstMessageChunkIndex, 'expected a message_chunk block').toBeGreaterThanOrEqual(0);
      expect(messageCompleteIndex, 'expected a message_complete block').toBeGreaterThanOrEqual(0);
      expect(startedIndex, 'execution_started must precede the first message_chunk').toBeLessThan(
        firstMessageChunkIndex
      );
      expect(
        terminatedIndex,
        'execution_terminated must arrive after message_complete'
      ).toBeGreaterThan(messageCompleteIndex);

      // The SSE payloads must match the persisted timeline events exactly (once `type` is restored
      // from the SSE `event:` line), so the frontend can de-duplicate the local copies against
      // fetched history using event id.
      const fetched = await getConversation(
        apiClient,
        adminCredentials.apiKeyHeader,
        conversationId!
      );
      const persistedStarted = fetched.events?.find(
        (event) => event.type === TimelineEventType.executionStarted
      );
      const persistedTerminated = fetched.events?.find(
        (event) => event.type === TimelineEventType.executionTerminated
      );
      expect(persistedStarted).toBeDefined();
      expect(persistedTerminated).toBeDefined();
      expect(sseBlockToEvent(blocks[startedIndex])).toStrictEqual(persistedStarted);
      expect(sseBlockToEvent(blocks[terminatedIndex])).toStrictEqual(persistedTerminated);
    });

    apiTest('invalid converse payload returns 400', async ({ apiClient }) => {
      const res = await apiClient.post(CHAT_CONVERSE, {
        headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        body: { input: 'bad access mode', access_control: { access_mode: 'shared' } },
        responseType: 'json',
      });
      expect(res).toHaveStatusCode(400);
    });
  }
);
