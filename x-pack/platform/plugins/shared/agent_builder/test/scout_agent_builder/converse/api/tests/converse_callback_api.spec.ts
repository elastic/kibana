/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  AgentBuilderErrorCode,
  ConversationAccessControlMode,
  ConversationOriginType,
  isConversationCreatedEvent,
  isConversationUpdatedEvent,
  isRoundCompleteEvent,
} from '@kbn/agent-builder-common';
import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import type {
  ChatCallbackAcceptedResponse,
  ChatCallbackEventResponse,
  ChatCallbackFailureResponse,
  ChatCallbackResponse,
} from '../../../../../common/http_api/chat_callback';
import type { ListConversationsResponse } from '../../../../../common/http_api/conversations';
import {
  CallbackTestServer,
  type CallbackTestServerRequest,
} from '../../../../scout_agent_builder_shared/lib/callback_test_server';
import {
  createGenAiConnectorForProxy,
  deleteConnectorById,
} from '../../../../scout_agent_builder_shared/lib/connector_kbn';
import {
  setupAgentDirectAnswer,
  setupAgentDirectError,
  setupAgentHangingAnswer,
} from '../../../../scout_agent_builder_shared/lib/proxy_scenario';
import {
  apiTest,
  COMMON_HEADERS,
  INTERNAL_AGENT_BUILDER,
  API_AGENT_BUILDER,
  ELASTIC_API_VERSION,
  getConversation,
} from '../fixtures';

const INTERNAL_API_VERSION = '1';

apiTest.describe(
  'Agent Builder - converse callback API',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    let adminCredentials: RoleApiCredentials;
    let adminInteractiveCookieHeader: Record<string, string>;
    let llmProxy: LlmProxy;
    let connectorId: string;
    let callbackServer: CallbackTestServer;
    let callbackServerUrl: string;
    const conversationIds = new Set<string>();

    apiTest.beforeAll(async ({ requestAuth, samlAuth, log, kbnClient }) => {
      adminCredentials = await requestAuth.getApiKeyForAdmin();
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      adminInteractiveCookieHeader = cookieHeader;

      llmProxy = await createLlmProxy(log);
      const { id } = await createGenAiConnectorForProxy(kbnClient, llmProxy);
      connectorId = id;

      callbackServer = new CallbackTestServer();
      callbackServerUrl = await callbackServer.start();
    });

    apiTest.afterAll(async ({ asAdmin, kbnClient }) => {
      for (const conversationId of conversationIds) {
        await asAdmin.delete(
          `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationId)}`
        );
      }

      await callbackServer.stop();
      llmProxy.close();
      await deleteConnectorById(kbnClient, connectorId);
    });

    const internalHeaders = () => ({
      ...COMMON_HEADERS,
      ...adminInteractiveCookieHeader,
      'elastic-api-version': INTERNAL_API_VERSION,
    });

    const publicHeaders = () => ({
      ...COMMON_HEADERS,
      ...adminCredentials.apiKeyHeader,
      'elastic-api-version': ELASTIC_API_VERSION,
    });

    const isEventPayload = (payload: ChatCallbackResponse): payload is ChatCallbackEventResponse =>
      'event' in payload;

    /**
     * Consumes streamed callback requests until one matches the predicate,
     * returning every request received along the way (match included).
     */
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

    const isRoundCompleteEventPayload = (payload: ChatCallbackResponse): boolean =>
      isEventPayload(payload) && isRoundCompleteEvent(payload.event);

    /**
     * Consumes streamed callback requests through the terminal round_complete event that ends a
     * round. round_complete is delivered last, after the conversation event, so this captures the
     * whole round including the conversation_created/updated payload.
     */
    const collectCompletedRoundRequests = () =>
      collectCallbackRequestsUntil(isRoundCompleteEventPayload);

    /** Waits for the terminal failure payload, skipping streamed event payloads. */
    const waitForFailurePayload = async (): Promise<ChatCallbackFailureResponse> => {
      const requests = await collectCallbackRequestsUntil((payload) => !isEventPayload(payload));
      return requests[requests.length - 1].body as ChatCallbackFailureResponse;
    };

    const getEvents = (requests: CallbackTestServerRequest[]) =>
      requests
        .map((request) => request.body as ChatCallbackResponse)
        .filter(isEventPayload)
        .map(({ event }) => event);

    const getConversationId = (requests: CallbackTestServerRequest[]): string => {
      const conversationEvent = getEvents(requests).find(
        (event) => isConversationCreatedEvent(event) || isConversationUpdatedEvent(event)
      );
      if (!conversationEvent) {
        throw new Error('No conversation event was delivered to the callback');
      }
      return (conversationEvent.data as { conversation_id: string }).conversation_id;
    };

    const getRoundCompleteEvent = (requests: CallbackTestServerRequest[]) => {
      const roundComplete = getEvents(requests).find(isRoundCompleteEvent);
      if (!roundComplete) {
        throw new Error('No round_complete event was delivered to the callback');
      }
      return roundComplete;
    };

    const getExecutionId = (requests: CallbackTestServerRequest[]): string =>
      (requests[0].body as ChatCallbackEventResponse).execution_id;

    apiTest('delivers completed response to callback URL', async ({ apiClient }) => {
      const mockedLlmResponse = 'Callback LLM response';
      const mockedLlmTitle = 'Callback Conversation Title';
      await setupAgentDirectAnswer({
        proxy: llmProxy,
        title: mockedLlmTitle,
        response: mockedLlmResponse,
      });

      const response = await apiClient.post(`${INTERNAL_AGENT_BUILDER}/converse/callback`, {
        headers: internalHeaders(),
        body: {
          input: 'Hello callback Agent Builder',
          connector_id: connectorId,
          execution_idempotency_key: 'Ev-callback-success',
          origin: {
            type: ConversationOriginType.Slack,
            external_conversation_id: 'team:T123/channel:C123/thread:callback-success',
          },
          callback: {
            url: `${callbackServerUrl}/callback?token=success`,
          },
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(202);

      const accepted = response.body as ChatCallbackAcceptedResponse;
      expect(typeof accepted.execution_id).toBe('string');
      expect(accepted.execution_id.length).toBeGreaterThan(0);

      const callbackRequests = await collectCompletedRoundRequests();
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      // Events stream incrementally: progress and conversation events are delivered before the
      // terminal round_complete.
      expect(callbackRequests.length).toBeGreaterThan(1);

      for (const callbackRequest of callbackRequests) {
        expect(callbackRequest.method).toBe('POST');
        expect(callbackRequest.url).toBe('/callback?token=success');
        expect(callbackRequest.headers['content-type']).toBe('application/json');

        const payload = callbackRequest.body as ChatCallbackEventResponse;
        expect(payload.execution_id).toBe(accepted.execution_id);
        expect(payload.event).toBeDefined();

        // Only the retried round_complete event carries an idempotency key.
        const expectedIdempotencyKey = isRoundCompleteEvent(payload.event)
          ? accepted.execution_id
          : undefined;
        expect(payload.idempotency_key).toBe(expectedIdempotencyKey);
      }

      const roundComplete = getRoundCompleteEvent(callbackRequests);
      expect(roundComplete.data.round.response.message).toBe(mockedLlmResponse);

      const conversationId = getConversationId(callbackRequests);
      expect(conversationId.length).toBeGreaterThan(0);

      conversationIds.add(conversationId);
    });

    apiTest(
      'stores callback origin authorship on list and get conversation responses',
      async ({ apiClient }) => {
        const externalConversationId = 'team:T123/channel:C123/thread:callback-authorship';
        const originAuthor = {
          id: 'U123',
          full_name: 'Jane Doe',
          username: 'jane',
        };

        await setupAgentDirectAnswer({
          proxy: llmProxy,
          title: 'Callback Authorship Conversation Title',
          response: 'Callback authorship response',
        });

        const response = await apiClient.post(`${INTERNAL_AGENT_BUILDER}/converse/callback`, {
          headers: internalHeaders(),
          body: {
            input: 'Hello from Slack',
            connector_id: connectorId,
            execution_idempotency_key: 'Ev-callback-authorship',
            access_control: {
              access_mode: ConversationAccessControlMode.Public,
            },
            origin: {
              type: ConversationOriginType.Slack,
              external_conversation_id: externalConversationId,
              author: originAuthor,
            },
            callback: {
              url: `${callbackServerUrl}/callback?token=authorship`,
            },
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(202);

        const accepted = response.body as ChatCallbackAcceptedResponse;

        const callbackRequests = await collectCompletedRoundRequests();

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        expect(getExecutionId(callbackRequests)).toBe(accepted.execution_id);
        const roundComplete = getRoundCompleteEvent(callbackRequests);
        expect(roundComplete.data.round.response.message).toBe('Callback authorship response');

        const conversationId = getConversationId(callbackRequests);
        conversationIds.add(conversationId);

        const conversation = await getConversation(
          apiClient,
          adminCredentials.apiKeyHeader,
          conversationId
        );

        const listResponse = await apiClient.get(
          `${API_AGENT_BUILDER}/conversations?${new URLSearchParams({
            agent_id: conversation.agent_id,
          })}`,
          {
            headers: publicHeaders(),
            responseType: 'json',
          }
        );

        expect(listResponse).toHaveStatusCode(200);

        const listBody = listResponse.body as ListConversationsResponse;
        const listedConversation = listBody.results.find(({ id }) => id === conversationId);
        expect(listedConversation?.origin).toStrictEqual({
          external_conversation_id: externalConversationId,
        });

        expect(conversation.origin).toStrictEqual({
          external_conversation_id: externalConversationId,
        });
        expect(conversation.access_control).toStrictEqual({
          access_mode: ConversationAccessControlMode.Public,
          entries: [],
        });
        expect(conversation.rounds).toHaveLength(1);

        const firstRound = conversation.rounds[0];
        expect(firstRound.origin).toStrictEqual({
          type: ConversationOriginType.Slack,
        });
        expect(firstRound.author).toStrictEqual(originAuthor);
        expect(firstRound.input).toMatchObject({
          message: 'Hello from Slack',
        });
      }
    );

    apiTest('delivers failed response to callback URL', async ({ apiClient }) => {
      await setupAgentDirectError({
        proxy: llmProxy,
        error: { type: 'error', statusCode: 400, errorMsg: 'Callback failure error' },
      });

      const response = await apiClient.post(`${INTERNAL_AGENT_BUILDER}/converse/callback`, {
        headers: internalHeaders(),
        body: {
          input: 'Hello callback failure',
          connector_id: connectorId,
          execution_idempotency_key: 'Ev-callback-failure',
          origin: {
            type: ConversationOriginType.Slack,
            external_conversation_id: 'team:T123/channel:C123/thread:callback-failure',
          },
          callback: {
            url: `${callbackServerUrl}/callback?token=failure`,
          },
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(202);

      const accepted = response.body as ChatCallbackAcceptedResponse;

      const callbackPayload = await waitForFailurePayload();
      expect(callbackPayload.execution_id).toBe(accepted.execution_id);
      expect(callbackPayload.idempotency_key).toBe(accepted.execution_id);
      expect(callbackPayload.error.code).toBe(AgentBuilderErrorCode.agentExecutionError);
      expect(typeof callbackPayload.error.message).toBe('string');
      expect(callbackPayload.error.message.length).toBeGreaterThan(0);
    });

    apiTest('delivers aborted response to callback URL', async ({ apiClient }) => {
      const finalAnswerIntercepted = setupAgentHangingAnswer({
        proxy: llmProxy,
        title: 'Callback Aborted Title',
      });

      const response = await apiClient.post(`${INTERNAL_AGENT_BUILDER}/converse/callback`, {
        headers: internalHeaders(),
        body: {
          input: 'Hello callback abort',
          connector_id: connectorId,
          execution_idempotency_key: 'Ev-callback-abort',
          origin: {
            type: ConversationOriginType.Slack,
            external_conversation_id: 'team:T123/channel:C123/thread:callback-abort',
          },
          callback: {
            url: `${callbackServerUrl}/callback?token=abort`,
          },
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(202);

      const accepted = response.body as ChatCallbackAcceptedResponse;

      // Wait until the agent has issued the (hanging) final answer request so the execution is
      // running and can be aborted while in flight.
      await finalAnswerIntercepted;

      const abortResponse = await apiClient.post(
        `${INTERNAL_AGENT_BUILDER}/executions/${encodeURIComponent(accepted.execution_id)}/abort`,
        {
          headers: internalHeaders(),
          responseType: 'json',
        }
      );

      expect(abortResponse).toHaveStatusCode(200);

      const callbackPayload = await waitForFailurePayload();
      expect(callbackPayload.execution_id).toBe(accepted.execution_id);
      expect(callbackPayload.idempotency_key).toBe(accepted.execution_id);
      expect(callbackPayload.error.code).toBe(AgentBuilderErrorCode.requestAborted);
      expect(typeof callbackPayload.error.message).toBe('string');
      expect(callbackPayload.error.message.length).toBeGreaterThan(0);
    });

    apiTest(
      'returns the existing execution for a replayed idempotency key',
      async ({ apiClient }) => {
        const executionIdempotencyKey = 'Ev-callback-replay';
        const requestBody = {
          input: 'Hello idempotent callback',
          connector_id: connectorId,
          execution_idempotency_key: executionIdempotencyKey,
          origin: {
            type: ConversationOriginType.Slack,
            external_conversation_id: 'team:T123/channel:C123/thread:callback-idempotency',
          },
          callback: {
            url: `${callbackServerUrl}/callback?token=idempotency`,
          },
        };
        let conversationId: string;
        let executionId: string;

        await apiTest.step('first delivery schedules an execution', async () => {
          await setupAgentDirectAnswer({
            proxy: llmProxy,
            title: 'Callback Idempotency Title',
            response: 'Idempotent callback response',
          });

          const first = await apiClient.post(`${INTERNAL_AGENT_BUILDER}/converse/callback`, {
            headers: internalHeaders(),
            body: requestBody,
            responseType: 'json',
          });

          expect(first).toHaveStatusCode(202);

          const firstAccepted = first.body as ChatCallbackAcceptedResponse;
          executionId = firstAccepted.execution_id;
          expect(executionId).toMatch(/^[a-f0-9]{64}$/);

          const firstRequests = await collectCompletedRoundRequests();

          await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

          expect(getExecutionId(firstRequests)).toBe(executionId);
          expect(getRoundCompleteEvent(firstRequests)).toBeDefined();

          conversationId = getConversationId(firstRequests);
          conversationIds.add(conversationId);
        });

        await apiTest.step(
          'replayed delivery is a no-op returning the existing execution',
          async () => {
            const replay = await apiClient.post(`${INTERNAL_AGENT_BUILDER}/converse/callback`, {
              headers: internalHeaders(),
              body: requestBody,
              responseType: 'json',
            });

            expect(replay).toHaveStatusCode(202);

            const replayAccepted = replay.body as ChatCallbackAcceptedResponse;
            expect(replayAccepted.execution_id).toBe(executionId);

            // No new execution ran: no LLM call was made (no interceptor was re-armed and the
            // proxy would reject an unexpected request) and the conversation kept a single round.
            const conversation = await getConversation(
              apiClient,
              adminCredentials.apiKeyHeader,
              conversationId
            );
            expect(conversation.rounds).toHaveLength(1);
            expect(conversation.rounds[0].response.message).toBe('Idempotent callback response');
          }
        );
      }
    );

    apiTest(
      'schedules a single execution for concurrent duplicate deliveries',
      async ({ apiClient }) => {
        await setupAgentDirectAnswer({
          proxy: llmProxy,
          title: 'Callback Concurrent Idempotency Title',
          response: 'Concurrent idempotent callback response',
        });

        const requestBody = {
          input: 'Hello concurrent idempotent callback',
          connector_id: connectorId,
          execution_idempotency_key: 'Ev-callback-concurrent',
          origin: {
            type: ConversationOriginType.Slack,
            external_conversation_id: 'team:T123/channel:C123/thread:callback-concurrency',
          },
          callback: {
            url: `${callbackServerUrl}/callback?token=concurrency`,
          },
        };

        const [first, second] = await Promise.all([
          apiClient.post(`${INTERNAL_AGENT_BUILDER}/converse/callback`, {
            headers: internalHeaders(),
            body: requestBody,
            responseType: 'json',
          }),
          apiClient.post(`${INTERNAL_AGENT_BUILDER}/converse/callback`, {
            headers: internalHeaders(),
            body: requestBody,
            responseType: 'json',
          }),
        ]);

        expect(first).toHaveStatusCode(202);
        expect(second).toHaveStatusCode(202);

        const firstAccepted = first.body as ChatCallbackAcceptedResponse;
        const secondAccepted = second.body as ChatCallbackAcceptedResponse;
        expect(firstAccepted.execution_id).toBe(secondAccepted.execution_id);

        const callbackRequests = await collectCompletedRoundRequests();

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        expect(getExecutionId(callbackRequests)).toBe(firstAccepted.execution_id);
        expect(getRoundCompleteEvent(callbackRequests)).toBeDefined();

        const conversationId = getConversationId(callbackRequests);
        conversationIds.add(conversationId);

        const conversation = await getConversation(
          apiClient,
          adminCredentials.apiKeyHeader,
          conversationId
        );
        expect(conversation.rounds).toHaveLength(1);
      }
    );

    apiTest(
      'schedules separate executions for the same key on different origins',
      async ({ apiClient }) => {
        const executionIdempotencyKey = 'Ev-callback-cross-origin';
        const executionIds: string[] = [];

        for (const thread of ['cross-origin-a', 'cross-origin-b']) {
          await setupAgentDirectAnswer({
            proxy: llmProxy,
            title: `Callback Cross Origin Title ${thread}`,
            response: `Cross origin response ${thread}`,
          });

          const response = await apiClient.post(`${INTERNAL_AGENT_BUILDER}/converse/callback`, {
            headers: internalHeaders(),
            body: {
              input: 'Hello cross origin idempotent callback',
              connector_id: connectorId,
              execution_idempotency_key: executionIdempotencyKey,
              origin: {
                type: ConversationOriginType.Slack,
                external_conversation_id: `team:T123/channel:C123/thread:${thread}`,
              },
              callback: {
                url: `${callbackServerUrl}/callback?token=cross-origin`,
              },
            },
            responseType: 'json',
          });

          expect(response).toHaveStatusCode(202);

          const accepted = response.body as ChatCallbackAcceptedResponse;
          executionIds.push(accepted.execution_id);

          const callbackRequests = await collectCompletedRoundRequests();

          await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

          expect(getExecutionId(callbackRequests)).toBe(accepted.execution_id);
          expect(getRoundCompleteEvent(callbackRequests)).toBeDefined();

          conversationIds.add(getConversationId(callbackRequests));
        }

        // The same key on a different origin thread is a different event: both ran.
        expect(executionIds[0]).not.toBe(executionIds[1]);
      }
    );

    apiTest(
      'prefers a caller-provided execution id over the idempotency key',
      async ({ apiClient }) => {
        await setupAgentDirectAnswer({
          proxy: llmProxy,
          title: 'Callback Execution Id Precedence Title',
          response: 'Execution id precedence response',
        });

        const executionId = '5c48249e-28e9-4711-b9c8-0a09a1a35c02';

        const response = await apiClient.post(`${INTERNAL_AGENT_BUILDER}/converse/callback`, {
          headers: internalHeaders(),
          body: {
            input: 'Hello execution id precedence callback',
            connector_id: connectorId,
            execution_id: executionId,
            execution_idempotency_key: 'Ev-callback-precedence',
            origin: {
              type: ConversationOriginType.Slack,
              external_conversation_id: 'team:T123/channel:C123/thread:callback-precedence',
            },
            callback: {
              url: `${callbackServerUrl}/callback?token=precedence`,
            },
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(202);

        const accepted = response.body as ChatCallbackAcceptedResponse;
        expect(accepted.execution_id).toBe(executionId);

        const callbackRequests = await collectCompletedRoundRequests();

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        expect(getExecutionId(callbackRequests)).toBe(executionId);

        conversationIds.add(getConversationId(callbackRequests));
      }
    );

    apiTest('continues conversation for repeated Slack origin', async ({ apiClient }) => {
      const origin = {
        type: ConversationOriginType.Slack,
        external_conversation_id: 'team:T123/channel:C123/thread:callback-continuation',
      };
      let conversationId: string;

      await apiTest.step('first round starts a new conversation', async () => {
        await setupAgentDirectAnswer({
          proxy: llmProxy,
          title: 'Callback Continuation Title',
          response: 'First callback response',
        });

        const first = await apiClient.post(`${INTERNAL_AGENT_BUILDER}/converse/callback`, {
          headers: internalHeaders(),
          body: {
            input: 'Start callback thread',
            connector_id: connectorId,
            execution_idempotency_key: 'Ev-callback-continuation-first',
            origin,
            callback: {
              url: `${callbackServerUrl}/callback?token=continuation-first`,
            },
          },
          responseType: 'json',
        });

        expect(first).toHaveStatusCode(202);

        const firstAccepted = first.body as ChatCallbackAcceptedResponse;
        const firstRequests = await collectCompletedRoundRequests();

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        expect(getExecutionId(firstRequests)).toBe(firstAccepted.execution_id);
        expect(getRoundCompleteEvent(firstRequests)).toBeDefined();

        conversationId = getConversationId(firstRequests);
        conversationIds.add(conversationId);
      });

      await apiTest.step('second round continues the same conversation', async () => {
        await setupAgentDirectAnswer({
          proxy: llmProxy,
          continueConversation: true,
          response: 'Second callback response',
        });

        const second = await apiClient.post(`${INTERNAL_AGENT_BUILDER}/converse/callback`, {
          headers: internalHeaders(),
          body: {
            input: 'Continue callback thread',
            connector_id: connectorId,
            execution_idempotency_key: 'Ev-callback-continuation-second',
            origin,
            callback: {
              url: `${callbackServerUrl}/callback?token=continuation-second`,
            },
          },
          responseType: 'json',
        });

        expect(second).toHaveStatusCode(202);

        const secondAccepted = second.body as ChatCallbackAcceptedResponse;
        const secondRequests = await collectCompletedRoundRequests();

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        expect(getExecutionId(secondRequests)).toBe(secondAccepted.execution_id);
        expect(getConversationId(secondRequests)).toBe(conversationId);
        expect(getRoundCompleteEvent(secondRequests).data.round.response.message).toBe(
          'Second callback response'
        );

        const conversation = await getConversation(
          apiClient,
          adminCredentials.apiKeyHeader,
          conversationId
        );

        expect(conversation.rounds).toHaveLength(2);
        expect(conversation.rounds[0].response.message).toBe('First callback response');
        expect(conversation.rounds[1].response.message).toBe('Second callback response');
      });
    });
  }
);
