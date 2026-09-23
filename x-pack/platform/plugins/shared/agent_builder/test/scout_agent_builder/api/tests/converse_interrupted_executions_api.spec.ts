/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  AgentBuilderErrorCode,
  ConversationOriginType,
  TimelineEventType,
  isConversationCreatedEvent,
  isConversationUpdatedEvent,
  isRoundCompleteEvent,
  type Conversation,
  type ConversationEvent,
} from '@kbn/agent-builder-common';
import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import type {
  ChatCallbackAcceptedResponse,
  ChatCallbackEventResponse,
  ChatCallbackFailureResponse,
  ChatCallbackResponse,
} from '../../../../common/http_api/chat_callback';
import {
  CallbackTestServer,
  type CallbackTestServerRequest,
} from '../../../scout_agent_builder_shared/lib/callback_test_server';
import {
  createGenAiConnectorForProxy,
  deleteConnectorById,
} from '../../../scout_agent_builder_shared/lib/connector_kbn';
import {
  setupAgentDirectAnswer,
  setupAgentDirectError,
  setupAgentHangingAnswer,
} from '../../../scout_agent_builder_shared/lib/proxy_scenario';
import { createSystemIndicesEsClient } from '../../../scout_agent_builder_shared/lib/system_indices_es_client';
import { AGENT_EXECUTIONS_INDEX } from '../../../scout_agent_builder_shared/lib/constants';
import { apiTest } from '../fixtures';
import { API_AGENT_BUILDER, COMMON_HEADERS, INTERNAL_AGENT_BUILDER } from '../fixtures/constants';
import { getConversation, postConverse, type ExecutionMode } from '../fixtures/converse_http';

const EXECUTION_MODES: ExecutionMode[] = ['local', 'task_manager'];
const INTERNAL_API_VERSION = '1';
// Idempotency keys and external ids are per run: a replayed key would return the previous run's
// execution without calling the LLM when the suite runs twice against the same stack.
const RUN_ID = Date.now().toString(36);

const TERMINAL_EVENT_TYPES: string[] = [
  TimelineEventType.executionTerminated,
  TimelineEventType.executionFailed,
  TimelineEventType.executionAborted,
];

interface LlmMessage {
  role?: string;
  content?: unknown;
}

/** Message content as text: a plain string, or the joined `text` parts of a multi-part content. */
const contentText = (content: unknown): string => {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part: { text?: unknown }) => (typeof part?.text === 'string' ? part.text : ''))
      .join('\n');
  }
  return '';
};

/**
 * The user-role message contents of the final-answer request made after `since` whose last user
 * message contains `input`. The proxy's history is cumulative for the whole file, so callers
 * capture `llmProxy.interceptedRequests.length` right before the converse call under test.
 * Consecutive human messages are merged into one multi-part user message by the LLM adapter, so
 * each returned entry may hold several original messages.
 */
const userMessagesOfFinalAnswerFor = (
  llmProxy: LlmProxy,
  input: string,
  /** Index into the proxy's cumulative request history to search from (captured before the call). */
  since: number
): string[] => {
  const requests = llmProxy.interceptedRequests
    .slice(since)
    .filter((request) => request.matchingInterceptorName === 'final-assistant-response')
    .map((request) => request.requestBody as { messages: LlmMessage[] });
  const request = requests.find((body) => {
    const lastUser = [...body.messages].reverse().find((message) => message.role === 'user');
    return contentText(lastUser?.content).includes(input);
  });
  if (!request) {
    throw new Error(`No final-answer request found whose last user message contains "${input}"`);
  }
  return request.messages
    .filter((message) => message.role === 'user')
    .map((message) => contentText(message.content));
};

const eventsOfExecution = (conversation: Conversation, executionId: string): ConversationEvent[] =>
  (conversation.events ?? []).filter((event) => event.execution_id === executionId);

apiTest.describe(
  'Agent Builder — interrupted executions are persisted on the conversation',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    let adminCredentials: RoleApiCredentials;
    let adminInteractiveCookieHeader: Record<string, string>;
    let llmProxy: LlmProxy;
    let connectorId: string;
    let callbackServer: CallbackTestServer;
    let callbackServerUrl: string;
    let sysEsClient: Client;
    const conversationIds = new Set<string>();
    /** Executions created by this suite are those indexed after it started (API suites run sequentially). */
    const suiteStartedAt = new Date().toISOString();

    apiTest.beforeAll(async ({ requestAuth, samlAuth, log, kbnClient, esClient, config }) => {
      adminCredentials = await requestAuth.getApiKeyForAdmin();
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      adminInteractiveCookieHeader = cookieHeader;

      llmProxy = await createLlmProxy(log);
      const { id } = await createGenAiConnectorForProxy(kbnClient, llmProxy);
      connectorId = id;

      callbackServer = new CallbackTestServer();
      callbackServerUrl = await callbackServer.start();
      sysEsClient = await createSystemIndicesEsClient(esClient, config);
    });

    apiTest.afterAll(async ({ asAdmin, kbnClient }) => {
      for (const conversationId of conversationIds) {
        await asAdmin.delete(
          `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationId)}`
        );
      }
      // Conversation deletion does not cascade to execution documents; remove the ones this
      // suite created so repeated runs do not accumulate them on a shared server.
      await sysEsClient.deleteByQuery({
        index: AGENT_EXECUTIONS_INDEX,
        query: { range: { '@timestamp': { gte: suiteStartedAt } } },
        refresh: true,
        conflicts: 'proceed',
      });
      await callbackServer.stop();
      llmProxy.close();
      await deleteConnectorById(kbnClient, connectorId);
    });

    const internalHeaders = () => ({
      ...COMMON_HEADERS,
      ...adminInteractiveCookieHeader,
      'elastic-api-version': INTERNAL_API_VERSION,
    });

    const isEventPayload = (payload: ChatCallbackResponse): payload is ChatCallbackEventResponse =>
      'event' in payload;

    const collectCallbackRequestsUntil = async (
      predicate: (payload: ChatCallbackResponse) => boolean
    ): Promise<CallbackTestServerRequest[]> => {
      const requests: CallbackTestServerRequest[] = [];
      let matched = false;
      while (!matched) {
        const request = await callbackServer.waitForRequest();
        requests.push(request);
        matched = predicate(request.body as ChatCallbackResponse);
      }
      return requests;
    };

    const collectCompletedRoundRequests = () =>
      collectCallbackRequestsUntil(
        (payload) => isEventPayload(payload) && isRoundCompleteEvent(payload.event)
      );

    const waitForFailurePayload = async (): Promise<ChatCallbackFailureResponse> => {
      const requests = await collectCallbackRequestsUntil((payload) => !isEventPayload(payload));
      return requests[requests.length - 1].body as ChatCallbackFailureResponse;
    };

    const getConversationId = (requests: CallbackTestServerRequest[]): string => {
      const conversationEvent = requests
        .map((request) => request.body as ChatCallbackResponse)
        .filter(isEventPayload)
        .map(({ event }) => event)
        .find((event) => isConversationCreatedEvent(event) || isConversationUpdatedEvent(event));
      if (!conversationEvent) {
        throw new Error('No conversation event was delivered to the callback');
      }
      return (conversationEvent.data as { conversation_id: string }).conversation_id;
    };

    for (const mode of EXECUTION_MODES) {
      apiTest(
        `[${mode}] persists a failed execution and surfaces it to the next round`,
        async ({ apiClient }) => {
          // 1. a successful first round (title generation happens here)
          await setupAgentDirectAnswer({
            proxy: llmProxy,
            title: 'Interrupted executions title',
            response: 'first ok',
          });
          const first = await postConverse(
            apiClient,
            adminCredentials.apiKeyHeader,
            { input: `first ${mode}`, connector_id: connectorId },
            mode
          );
          expect(first).toHaveStatusCode(200);
          const conversationId = (first.body as { conversation_id: string }).conversation_id;
          conversationIds.add(conversationId);
          await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

          // 2. the second round's LLM call fails
          await setupAgentDirectError({
            proxy: llmProxy,
            continueConversation: true,
            error: { type: 'error', statusCode: 500, errorMsg: 'boom' },
          });
          const second = await postConverse(
            apiClient,
            adminCredentials.apiKeyHeader,
            { input: `second ${mode}`, conversation_id: conversationId, connector_id: connectorId },
            mode
          );
          // the failure is surfaced as the agent's execution error. Its HTTP status echoes the
          // upstream connector failure (pre-existing contract: an agentExecutionError carries the
          // connector's status), so it is asserted against the persisted error below rather than
          // hard-coded here; the message is the connector failure.
          expect(second.statusCode).toBeGreaterThanOrEqual(400);
          const failureBody = second.body as { message: string };
          expect(typeof failureBody.message).toBe('string');
          expect(failureBody.message).toContain('Error calling connector');
          await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

          // 3. the failed execution is on the conversation as a full projection, not as a round
          const conversation = await getConversation(
            apiClient,
            adminCredentials.apiKeyHeader,
            conversationId
          );
          expect(conversation.rounds).toHaveLength(1);
          const failed = (conversation.events ?? []).filter(
            (event) => event.type === TimelineEventType.executionFailed
          );
          expect(failed).toHaveLength(1);
          const executionId = failed[0].execution_id!;
          const executionEvents = eventsOfExecution(conversation, executionId);
          expect(
            executionEvents.some((event) => event.type === TimelineEventType.executionStarted)
          ).toBe(true);
          expect(
            executionEvents.filter((event) => TERMINAL_EVENT_TYPES.includes(event.type))
          ).toHaveLength(1);
          const trigger = conversation.events?.find(
            (event) => event.id === failed[0].trigger_event_id
          );
          expect(trigger?.type).toBe(TimelineEventType.userMessage);
          expect((trigger?.data as { message: string }).message).toBe(`second ${mode}`);
          const failedData = failed[0].data as {
            error: { code: string; message: string; meta?: { statusCode?: number } };
            time_to_last_token: number;
          };
          expect(typeof failedData.error.code).toBe('string');
          expect(typeof failedData.time_to_last_token).toBe('number');
          // parity: the persisted error is the one the API returned — same message, same status
          expect(failedData.error.message).toBe(failureBody.message);
          expect(failedData.error.meta?.statusCode ?? 500).toBe(second.statusCode);

          // 4. a third, successful round sees the failed message followed by the failure notice
          await setupAgentDirectAnswer({
            proxy: llmProxy,
            continueConversation: true,
            response: 'third ok',
          });
          const requestsBeforeThird = llmProxy.interceptedRequests.length;
          const third = await postConverse(
            apiClient,
            adminCredentials.apiKeyHeader,
            { input: `third ${mode}`, conversation_id: conversationId, connector_id: connectorId },
            mode
          );
          expect(third).toHaveStatusCode(200);
          await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

          const userMessages = userMessagesOfFinalAnswerFor(
            llmProxy,
            `third ${mode}`,
            requestsBeforeThird
          );
          const history = userMessages.join('\n');
          const failedAt = history.indexOf(`second ${mode}`);
          const noticeAt = history.indexOf('<system_notice>');
          expect(failedAt).toBeGreaterThanOrEqual(0);
          // the failure notice follows the failed message and precedes the next input
          expect(noticeAt).toBeGreaterThan(failedAt);
          expect(noticeAt).toBeLessThan(history.lastIndexOf(`third ${mode}`));
          expect(history).toContain('attempt to answer the previous message failed');

          const after = await getConversation(
            apiClient,
            adminCredentials.apiKeyHeader,
            conversationId
          );
          expect(after.rounds).toHaveLength(2);
          expect(after.rounds.map((round) => round.input.message)).toStrictEqual([
            `first ${mode}`,
            `third ${mode}`,
          ]);
        }
      );
    }

    apiTest(
      'aborted execution (callback / task manager) is persisted, reports aborted, and is hidden from the next round',
      async ({ apiClient }) => {
        const externalConversationId = `team:T123/channel:C123/thread:interrupted-abort-${RUN_ID}`;
        const converseViaCallback = (input: string, idempotencyKey: string, token: string) =>
          apiClient.post(`${INTERNAL_AGENT_BUILDER}/converse/callback`, {
            headers: internalHeaders(),
            body: {
              input,
              connector_id: connectorId,
              execution_idempotency_key: idempotencyKey,
              origin: {
                type: ConversationOriginType.Slack,
                external_conversation_id: externalConversationId,
              },
              callback: { url: `${callbackServerUrl}/callback?token=${token}` },
            },
            responseType: 'json',
          });

        // 1. a successful first round through the callback route
        await setupAgentDirectAnswer({
          proxy: llmProxy,
          title: 'Interrupted abort title',
          response: 'first ok',
        });
        const first = await converseViaCallback(
          'first',
          `Ev-interrupted-abort-1-${RUN_ID}`,
          'abort-1'
        );
        expect(first).toHaveStatusCode(202);
        const firstRequests = await collectCompletedRoundRequests();
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
        const conversationId = getConversationId(firstRequests);
        conversationIds.add(conversationId);

        // 2. a second round whose final answer hangs, aborted mid-flight
        const hanging = setupAgentHangingAnswer({ proxy: llmProxy, continueConversation: true });
        const second = await converseViaCallback(
          'second aborted',
          `Ev-interrupted-abort-2-${RUN_ID}`,
          'abort-2'
        );
        expect(second).toHaveStatusCode(202);
        const accepted = second.body as ChatCallbackAcceptedResponse;
        await hanging;

        const abortResponse = await apiClient.post(
          `${INTERNAL_AGENT_BUILDER}/executions/${encodeURIComponent(accepted.execution_id)}/abort`,
          { headers: internalHeaders(), responseType: 'json' }
        );
        expect(abortResponse).toHaveStatusCode(200);
        // by default the abort route returns once the interruption is recorded on the conversation
        expect(abortResponse.body).toStrictEqual({ acknowledged: true, terminal_persisted: true });

        // exactly one failure callback, classified as an abort
        const failure = await waitForFailurePayload();
        expect(failure.execution_id).toBe(accepted.execution_id);
        expect(failure.error.code).toBe(AgentBuilderErrorCode.requestAborted);

        // 3. the execution_aborted terminal is on the conversation on the very next read: no
        //    polling, the abort call waited for the worker to record it
        const conversation: Conversation | undefined = await getConversation(
          apiClient,
          adminCredentials.apiKeyHeader,
          conversationId
        );
        const aborted = (conversation?.events ?? []).filter(
          (event) => event.type === TimelineEventType.executionAborted
        );
        expect(aborted).toHaveLength(1);
        const executionId = aborted[0].execution_id!;
        expect(
          eventsOfExecution(conversation!, executionId).filter((event) =>
            TERMINAL_EVENT_TYPES.includes(event.type)
          )
        ).toHaveLength(1);
        expect(conversation!.rounds).toHaveLength(1);
        // the abort came through the API: the terminal records the source and the requesting user
        const abortedBy = (
          aborted[0].data as {
            aborted_by?: { source: string; actor?: { id?: unknown; username?: unknown } };
          }
        ).aborted_by;
        expect(abortedBy?.source).toBe('api');
        expect(typeof abortedBy?.actor?.id).toBe('string');
        expect(typeof abortedBy?.actor?.username).toBe('string');

        // 4. the execution document says aborted (not failed), with the abort error recorded. The
        //    worker writes that error after callback delivery settled, which can be after the
        //    failure callback was observed above: poll for it, bounded.
        interface ExecutionDoc {
          status: string;
          error?: { code: string; meta?: { abort_reason?: { source: string } } };
          abort_reason?: { source: string };
        }
        let doc: Awaited<ReturnType<typeof sysEsClient.get<ExecutionDoc>>> | undefined;
        const docDeadline = Date.now() + 15_000;
        while (Date.now() < docDeadline) {
          await sysEsClient.indices.refresh({ index: AGENT_EXECUTIONS_INDEX });
          doc = await sysEsClient.get<ExecutionDoc>({
            index: AGENT_EXECUTIONS_INDEX,
            id: accepted.execution_id,
          });
          if (doc._source?.error?.code === AgentBuilderErrorCode.requestAborted) {
            break;
          }
          await new Promise<void>((resolve) => setTimeout(resolve, 500));
        }
        expect(doc).toBeDefined();
        expect(doc!._source?.status).toBe('aborted');
        expect(doc!._source?.error?.code).toBe(AgentBuilderErrorCode.requestAborted);
        expect(doc!._source?.abort_reason?.source).toBe('api');
        expect(doc!._source?.error?.meta?.abort_reason?.source).toBe('api');

        // 5. a third round does not see the aborted round's input
        await setupAgentDirectAnswer({
          proxy: llmProxy,
          continueConversation: true,
          response: 'third ok',
        });
        const requestsBeforeThird = llmProxy.interceptedRequests.length;
        const third = await converseViaCallback(
          'third after abort',
          `Ev-interrupted-abort-3-${RUN_ID}`,
          'abort-3'
        );
        expect(third).toHaveStatusCode(202);
        await collectCompletedRoundRequests();
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        const userMessages = userMessagesOfFinalAnswerFor(
          llmProxy,
          'third after abort',
          requestsBeforeThird
        );
        expect(userMessages.some((content) => content.includes('second aborted'))).toBe(false);
      }
    );
  }
);
