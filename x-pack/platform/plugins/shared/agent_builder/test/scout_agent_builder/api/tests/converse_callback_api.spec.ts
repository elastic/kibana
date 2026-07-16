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
  ExecutionStatus,
} from '@kbn/agent-builder-common';
import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import type {
  ChatCallbackAcceptedResponse,
  ChatCallbackFailurePayload,
  ChatCallbackSuccessPayload,
} from '../../../../common/http_api/chat_callback';
import type { ListConversationsResponse } from '../../../../common/http_api/conversations';
import { CallbackTestServer } from '../../../scout_agent_builder_shared/lib/callback_test_server';
import {
  createGenAiConnectorForProxy,
  deleteConnectorById,
} from '../../../scout_agent_builder_shared/lib/connector_kbn';
import {
  setupAgentDirectAnswer,
  setupAgentDirectError,
  setupAgentHangingAnswer,
} from '../../../scout_agent_builder_shared/lib/proxy_scenario';
import { apiTest } from '../fixtures';
import {
  COMMON_HEADERS,
  INTERNAL_AGENT_BUILDER,
  API_AGENT_BUILDER,
  ELASTIC_API_VERSION,
} from '../fixtures/constants';
import { getConversation } from '../fixtures/converse_http';

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
      expect(accepted.status).toBe(ExecutionStatus.scheduled);

      const callbackRequest = await callbackServer.waitForRequest();
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      expect(callbackRequest.method).toBe('POST');
      expect(callbackRequest.url).toBe('/callback?token=success');
      expect(callbackRequest.headers['content-type']).toBe('application/json');

      const callbackPayload = callbackRequest.body as ChatCallbackSuccessPayload;
      expect(callbackPayload.execution_id).toBe(accepted.execution_id);
      expect(callbackPayload.status).toBe(ExecutionStatus.completed);
      expect(callbackPayload.response.response.message).toBe(mockedLlmResponse);
      expect(typeof callbackPayload.response.conversation_id).toBe('string');
      expect(callbackPayload.response.conversation_id.length).toBeGreaterThan(0);

      conversationIds.add(callbackPayload.response.conversation_id);
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
        expect(accepted.status).toBe(ExecutionStatus.scheduled);

        const callbackPayload = (await callbackServer.waitForRequest())
          .body as ChatCallbackSuccessPayload;

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        expect(callbackPayload.execution_id).toBe(accepted.execution_id);
        expect(callbackPayload.status).toBe(ExecutionStatus.completed);
        expect(callbackPayload.response.response.message).toBe('Callback authorship response');

        const { conversation_id: conversationId } = callbackPayload.response;
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
      expect(accepted.status).toBe(ExecutionStatus.scheduled);

      const callbackRequest = await callbackServer.waitForRequest();

      expect(callbackRequest.method).toBe('POST');
      expect(callbackRequest.url).toBe('/callback?token=failure');
      expect(callbackRequest.headers['content-type']).toBe('application/json');

      const callbackPayload = callbackRequest.body as ChatCallbackFailurePayload;
      expect(callbackPayload.execution_id).toBe(accepted.execution_id);
      expect(callbackPayload.status).toBe(ExecutionStatus.failed);
      expect(callbackPayload.error?.code).toBe(AgentBuilderErrorCode.agentExecutionError);
      expect(typeof callbackPayload.error?.message).toBe('string');
      expect(callbackPayload.error?.message.length).toBeGreaterThan(0);
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
      expect(accepted.status).toBe(ExecutionStatus.scheduled);

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

      const callbackRequest = await callbackServer.waitForRequest();

      expect(callbackRequest.method).toBe('POST');
      expect(callbackRequest.url).toBe('/callback?token=abort');
      expect(callbackRequest.headers['content-type']).toBe('application/json');

      const callbackPayload = callbackRequest.body as ChatCallbackFailurePayload;
      expect(callbackPayload.execution_id).toBe(accepted.execution_id);
      expect(callbackPayload.status).toBe(ExecutionStatus.aborted);
      expect(callbackPayload.error?.code).toBe(AgentBuilderErrorCode.requestAborted);
      expect(typeof callbackPayload.error?.message).toBe('string');
      expect(callbackPayload.error?.message.length).toBeGreaterThan(0);
    });

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
            origin,
            callback: {
              url: `${callbackServerUrl}/callback?token=continuation-first`,
            },
          },
          responseType: 'json',
        });

        expect(first).toHaveStatusCode(202);

        const firstAccepted = first.body as ChatCallbackAcceptedResponse;
        const firstCallback = (await callbackServer.waitForRequest())
          .body as ChatCallbackSuccessPayload;

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        expect(firstCallback.execution_id).toBe(firstAccepted.execution_id);
        expect(firstCallback.status).toBe(ExecutionStatus.completed);

        conversationId = firstCallback.response.conversation_id;
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
            origin,
            callback: {
              url: `${callbackServerUrl}/callback?token=continuation-second`,
            },
          },
          responseType: 'json',
        });

        expect(second).toHaveStatusCode(202);

        const secondAccepted = second.body as ChatCallbackAcceptedResponse;
        const secondCallback = (await callbackServer.waitForRequest())
          .body as ChatCallbackSuccessPayload;

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        expect(secondCallback.execution_id).toBe(secondAccepted.execution_id);
        expect(secondCallback.status).toBe(ExecutionStatus.completed);
        expect(secondCallback.response.conversation_id).toBe(conversationId);
        expect(secondCallback.response.response.message).toBe('Second callback response');

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
