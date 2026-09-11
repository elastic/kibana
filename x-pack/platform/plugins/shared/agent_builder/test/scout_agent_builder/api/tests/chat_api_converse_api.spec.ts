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
 * its `events` timeline. The experimental feature flag that gates `/api/chat` is force-enabled by the
 * Scout server config, so these routes are reachable here (the flag-off 404 is covered by unit tests).
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

      // The SSE payloads must match the persisted timeline events byte-for-byte, so the frontend
      // can de-duplicate the local copies against fetched history using event id.
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
      expect(blocks[startedIndex].data).toStrictEqual(persistedStarted);
      expect(blocks[terminatedIndex].data).toStrictEqual(persistedTerminated);
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
