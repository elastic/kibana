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
import {
  ChatEventType,
  ConversationAccessControlMode,
  ConversationRoundStepType,
  ToolResultType,
  type BrowserToolCallEventData,
  type ToolCallStep,
} from '@kbn/agent-builder-common';
import {
  createGenAiConnectorForProxy,
  deleteConnectorById,
} from '../../../../scout_agent_builder_shared/lib/connector_kbn';
import {
  setupAgentCallToolThenAnswer,
  setupAgentParallelToolCallsThenAnswer,
} from '../../../../scout_agent_builder_shared/lib/proxy_scenario';
import { chatApiPath } from '../../../../../common/constants';
import type { ChatRequestBodyPayload } from '../../../../../common/http_api/chat';
import {
  apiTest,
  API_AGENT_BUILDER,
  CHAT_CONVERSATIONS_INDEX,
  COMMON_HEADERS,
  ELASTIC_API_VERSION,
  getConversation,
  postBrowserToolResult,
  type ExecutionMode,
} from '../fixtures';

const CHAT_CONVERSE_ASYNC = `${chatApiPath}/converse/async`;
const EXECUTION_MODES: ExecutionMode[] = ['local', 'task_manager'];
const TEST_PREFIX = 'browser-tools-test';
const CLIENT_ID = 'test-client';
const FINAL_ANSWER = 'The tool answered';

const echoTool = (timeoutMs: number) => ({
  id: 'echo_tool',
  description: 'Echoes back the text',
  schema: {
    type: 'object',
    properties: { text: { type: 'string' } },
    required: ['text'],
  },
  timeout_ms: timeoutMs,
});

interface SseEvent {
  type: string;
  data: any;
}

const parseSseBlock = (block: string): SseEvent | undefined => {
  const lines = block.split('\n');
  const type = lines
    .find((line) => line.startsWith('event:'))
    ?.slice('event:'.length)
    .trim();
  const dataLine = lines.find((line) => line.startsWith('data:'));
  if (!type || !dataLine) {
    return undefined;
  }
  try {
    return { type, data: JSON.parse(dataLine.slice('data:'.length).trim()) };
  } catch {
    return undefined;
  }
};

/**
 * Streams a converse request and hands each SSE event to `onEvent` as it arrives, so the test can
 * answer browser tool calls while the execution is waiting on them (the Scout api client buffers
 * whole responses). Resolves with every event once the stream ends.
 */
const streamConverse = async ({
  url,
  headers,
  body,
  onEvent,
}: {
  url: string;
  headers: Record<string, string>;
  body: ChatRequestBodyPayload;
  onEvent?: (event: SseEvent) => Promise<void>;
}): Promise<SseEvent[]> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { ...COMMON_HEADERS, ...headers },
    body: JSON.stringify(body),
  });
  expect(response.status).toBe(200);

  const events: SseEvent[] = [];
  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
    buffer += decoder.decode(chunk, { stream: true });
    let separator = buffer.indexOf('\n\n');
    while (separator !== -1) {
      const event = parseSseBlock(buffer.slice(0, separator));
      buffer = buffer.slice(separator + 2);
      if (event) {
        events.push(event);
        await onEvent?.(event);
      }
      separator = buffer.indexOf('\n\n');
    }
  }
  const last = parseSseBlock(buffer);
  if (last) {
    events.push(last);
    await onEvent?.(last);
  }
  return events;
};

const browserToolCallData = (event: SseEvent): BrowserToolCallEventData | undefined =>
  event.type === ChatEventType.browserToolCall
    ? (event.data.data as BrowserToolCallEventData)
    : undefined;

const conversationIdOf = (events: SseEvent[]): string => {
  const conversationId = events.find(
    ({ type, data }) =>
      (type === ChatEventType.conversationCreated || type === ChatEventType.conversationUpdated) &&
      typeof data?.data?.conversation_id === 'string'
  )?.data.data.conversation_id;
  if (!conversationId) {
    throw new Error('expected a conversation_id in the SSE stream');
  }
  return conversationId;
};

const toolCallSteps = (steps: Array<{ type: string }>): ToolCallStep[] =>
  steps.filter((step) => step.type === ConversationRoundStepType.toolCall) as ToolCallStep[];

/** The text of the tool messages the LLM received on its final (post tool call) turn. */
const finalTurnToolMessages = (llmProxy: LlmProxy): string[] => {
  const finalRequests = llmProxy.interceptedRequests.filter(
    (request) => request.matchingInterceptorName === 'final-assistant-response'
  );
  const finalRequest = finalRequests[finalRequests.length - 1]?.requestBody;
  expect(finalRequest).toBeDefined();
  return finalRequest!.messages
    .filter((message) => message.role === 'tool')
    .map((message) =>
      typeof message.content === 'string' ? message.content : JSON.stringify(message.content)
    );
};

apiTest.describe('Agent Builder — browser tools', { tag: [...tags.stateful.classic] }, () => {
  const testRunId = randomUUID();
  const roleName = `${TEST_PREFIX}-role-${testRunId}`;
  const otherUser = {
    username: `${TEST_PREFIX}-other-${testRunId}`,
    password: 'other-password',
  };
  const otherUserHeaders = {
    Authorization: `Basic ${Buffer.from(`${otherUser.username}:${otherUser.password}`).toString(
      'base64'
    )}`,
  };

  let adminCredentials: RoleApiCredentials;
  let llmProxy: LlmProxy;
  let connectorId: string;
  let converseUrl: string;
  const conversationIds: string[] = [];

  apiTest.beforeAll(async ({ requestAuth, log, kbnClient, kbnUrl, esClient }) => {
    adminCredentials = await requestAuth.getApiKeyForAdmin();
    llmProxy = await createLlmProxy(log);
    ({ id: connectorId } = await createGenAiConnectorForProxy(kbnClient, llmProxy));

    const url = new URL(kbnUrl.get(CHAT_CONVERSE_ASYNC));
    url.username = '';
    url.password = '';
    converseUrl = url.href;

    await kbnClient.request({
      method: 'PUT',
      path: `/api/security/role/${encodeURIComponent(roleName)}`,
      headers: { 'elastic-api-version': ELASTIC_API_VERSION },
      body: {
        elasticsearch: { cluster: ['monitor_inference'], indices: [], run_as: [] },
        kibana: [
          {
            base: [],
            feature: { agentBuilder: ['minimal_read', 'manage_agents'], actions: ['read'] },
            spaces: ['*'],
          },
        ],
      },
    });
    await esClient.security.putUser({
      username: otherUser.username,
      password: otherUser.password,
      roles: [roleName],
    });
  });

  apiTest.beforeEach(() => {
    llmProxy.clear();
  });

  apiTest.afterAll(async ({ asAdmin, kbnClient, esClient }) => {
    for (const id of conversationIds) {
      await asAdmin.delete(`${API_AGENT_BUILDER}/conversations/${encodeURIComponent(id)}`);
    }
    await esClient.deleteByQuery({
      index: CHAT_CONVERSATIONS_INDEX,
      query: { term: { user_name: otherUser.username } },
      wait_for_completion: true,
      refresh: true,
      conflicts: 'proceed',
      ignore_unavailable: true,
    });
    llmProxy.close();
    await deleteConnectorById(kbnClient, connectorId);
    await esClient.security.deleteUser({ username: otherUser.username }, { ignore: [404] });
    await kbnClient.request({
      method: 'DELETE',
      path: `/api/security/role/${encodeURIComponent(roleName)}`,
      headers: { 'elastic-api-version': ELASTIC_API_VERSION },
      ignoreErrors: [404],
    });
  });

  for (const mode of EXECUTION_MODES) {
    const converseBody = (
      executionId: string,
      timeoutMs: number,
      extra: Partial<ChatRequestBodyPayload> = {}
    ): ChatRequestBodyPayload =>
      ({
        input: 'Use the echo tool',
        connector_id: connectorId,
        execution_id: executionId,
        _execution_mode: mode,
        browser_api_tools: [echoTool(timeoutMs)],
        browser_tools: { client_id: CLIENT_ID, tool_ids: [] },
        ...extra,
      } as ChatRequestBodyPayload);

    apiTest(
      `LLM calls a legacy browser tool, the client posts a result, and the result reaches the LLM and is persisted [${mode}]`,
      async ({ apiClient }) => {
        setupAgentCallToolThenAnswer({
          proxy: llmProxy,
          toolName: 'echo_tool',
          toolArg: { text: 'ping' },
          response: FINAL_ANSWER,
        });

        const executionId = randomUUID();
        const answered: string[] = [];
        const events = await streamConverse({
          url: converseUrl,
          headers: adminCredentials.apiKeyHeader,
          body: converseBody(executionId, 10_000),
          onEvent: async (event) => {
            const call = browserToolCallData(event);
            if (!call) {
              return;
            }
            expect(call.tool_id).toBe('echo_tool');
            expect(call.params).toStrictEqual({ text: 'ping' });
            expect(call.client_id).toBe(CLIENT_ID);
            expect(new Date(call.expires_at).getTime()).toBeGreaterThan(Date.now());

            const res = await postBrowserToolResult(apiClient, adminCredentials.apiKeyHeader, {
              executionId,
              toolCallId: call.tool_call_id,
              body: { client_id: CLIENT_ID, result: { status: 'ok', content: 'pong' } },
            });
            expect(res).toHaveStatusCode(204);
            answered.push(call.tool_call_id);
          },
        });
        const conversationId = conversationIdOf(events);
        conversationIds.push(conversationId);
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        expect(answered).toHaveLength(1);
        expect(finalTurnToolMessages(llmProxy).some((content) => content.includes('pong'))).toBe(
          true
        );

        const conversation = await getConversation(
          apiClient,
          adminCredentials.apiKeyHeader,
          conversationId
        );
        expect(conversation.rounds).toHaveLength(1);
        const [round] = conversation.rounds;
        expect(round.response.message).toBe(FINAL_ANSWER);
        const [step] = toolCallSteps(round.steps);
        expect(step.tool_id).toBe('echo_tool');
        expect(step.tool_call_id).toBe(answered[0]);
        expect(step.results).toHaveLength(1);
        expect(step.results[0].type).toBe(ToolResultType.other);
        expect(step.results[0].data).toStrictEqual({ content: 'pong' });
      }
    );

    apiTest(`times out when nobody answers [${mode}]`, async ({ apiClient }) => {
      apiTest.setTimeout(120_000);
      setupAgentCallToolThenAnswer({
        proxy: llmProxy,
        toolName: 'echo_tool',
        toolArg: { text: 'ping' },
        response: FINAL_ANSWER,
      });

      const executionId = randomUUID();
      const events = await streamConverse({
        url: converseUrl,
        headers: adminCredentials.apiKeyHeader,
        body: converseBody(executionId, 1_000),
      });
      const conversationId = conversationIdOf(events);
      conversationIds.push(conversationId);
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      expect(events.filter((event) => browserToolCallData(event))).toHaveLength(1);

      const conversation = await getConversation(
        apiClient,
        adminCredentials.apiKeyHeader,
        conversationId
      );
      const [round] = conversation.rounds;
      expect(round.response.message).toBe(FINAL_ANSWER);
      const [step] = toolCallSteps(round.steps);
      expect(step.tool_id).toBe('echo_tool');
      expect(step.results).toHaveLength(1);
      expect(step.results[0].type).toBe(ToolResultType.error);
      expect(String((step.results[0].data as { message: string }).message)).toContain(
        'did not answer'
      );
    });

    apiTest(`two browser tool calls in one turn [${mode}]`, async ({ apiClient }) => {
      await setupAgentParallelToolCallsThenAnswer({
        proxy: llmProxy,
        response: FINAL_ANSWER,
        toolCalls: [
          { name: 'echo_tool', args: { text: 'one' } },
          { name: 'echo_tool', args: { text: 'two' } },
        ],
      });

      const executionId = randomUUID();
      const answeredTexts: string[] = [];
      const events = await streamConverse({
        url: converseUrl,
        headers: adminCredentials.apiKeyHeader,
        body: converseBody(executionId, 10_000),
        onEvent: async (event) => {
          const call = browserToolCallData(event);
          if (!call) {
            return;
          }
          const text = String(call.params.text);
          const res = await postBrowserToolResult(apiClient, adminCredentials.apiKeyHeader, {
            executionId,
            toolCallId: call.tool_call_id,
            body: { client_id: CLIENT_ID, result: { status: 'ok', content: `pong-${text}` } },
          });
          expect(res).toHaveStatusCode(204);
          answeredTexts.push(text);
        },
      });
      const conversationId = conversationIdOf(events);
      conversationIds.push(conversationId);
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      expect([...answeredTexts].sort()).toStrictEqual(['one', 'two']);
      const toolMessages = finalTurnToolMessages(llmProxy);
      expect(toolMessages.some((content) => content.includes('pong-one'))).toBe(true);
      expect(toolMessages.some((content) => content.includes('pong-two'))).toBe(true);

      const conversation = await getConversation(
        apiClient,
        adminCredentials.apiKeyHeader,
        conversationId
      );
      const steps = toolCallSteps(conversation.rounds[0].steps);
      expect(steps).toHaveLength(2);
      expect(
        steps
          .map((step) => {
            expect(step.tool_id).toBe('echo_tool');
            expect(step.results[0].type).toBe(ToolResultType.other);
            return (step.results[0].data as { content: string }).content;
          })
          .sort()
      ).toStrictEqual(['pong-one', 'pong-two']);
    });

    apiTest(`a second user cannot answer [${mode}]`, async ({ apiClient }) => {
      setupAgentCallToolThenAnswer({
        proxy: llmProxy,
        toolName: 'echo_tool',
        toolArg: { text: 'ping' },
        response: FINAL_ANSWER,
      });

      const executionId = randomUUID();
      let answered = false;
      const events = await streamConverse({
        url: converseUrl,
        headers: adminCredentials.apiKeyHeader,
        // A public conversation: the other user can read it, but still cannot answer for the owner.
        body: converseBody(executionId, 10_000, {
          access_control: { access_mode: ConversationAccessControlMode.Public },
        }),
        onEvent: async (event) => {
          const call = browserToolCallData(event);
          if (!call) {
            return;
          }
          const body = {
            client_id: CLIENT_ID,
            result: { status: 'ok' as const, content: 'pong' },
          };

          const asOther = await postBrowserToolResult(apiClient, otherUserHeaders, {
            executionId,
            toolCallId: call.tool_call_id,
            body,
          });
          expect(asOther).toHaveStatusCode(403);

          const asOwner = await postBrowserToolResult(apiClient, adminCredentials.apiKeyHeader, {
            executionId,
            toolCallId: call.tool_call_id,
            body,
          });
          expect(asOwner).toHaveStatusCode(204);
          answered = true;
        },
      });
      const conversationId = conversationIdOf(events);
      conversationIds.push(conversationId);
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      expect(answered).toBe(true);
      const conversation = await getConversation(apiClient, otherUserHeaders, conversationId);
      const [step] = toolCallSteps(conversation.rounds[0].steps);
      expect(step.results[0].type).toBe(ToolResultType.other);
      expect(step.results[0].data).toStrictEqual({ content: 'pong' });
    });
  }

  apiTest('builtin ids are rejected when unknown', async ({ asAdmin }) => {
    const res = await asAdmin.post(CHAT_CONVERSE_ASYNC, {
      body: {
        input: 'Hello',
        browser_tools: { client_id: 'c', tool_ids: ['nope'] },
        _execution_mode: 'local',
      },
      responseType: 'json',
    });
    expect(res).toHaveStatusCode(400);
    expect(JSON.stringify(res.body)).toContain('nope');
  });
});
