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
import { setupAnswerAgentCallsInvalidTool } from '../fixtures/setup_answer_agent_invalid_tool';
import { apiTest } from '../fixtures';
import { API_AGENT_BUILDER } from '../fixtures/constants';
import { getConversation, postConverse, type ExecutionMode } from '../fixtures/converse_http';

const EXECUTION_MODES: ExecutionMode[] = ['local', 'task_manager'];

const toolContentToErrorMessage = (toolContent: string): string => {
  try {
    const parsed = JSON.parse(toolContent) as { response?: unknown };
    const fromParsed =
      typeof parsed === 'object' && parsed !== null && typeof parsed.response === 'string'
        ? parsed.response
        : undefined;
    return fromParsed ?? toolContent;
  } catch {
    return toolContent;
  }
};

apiTest.describe(
  'Agent Builder — converse error handling & regenerate API',
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

    apiTest.afterAll(async ({ asAdmin, kbnClient }) => {
      for (const id of conversationIds) {
        await asAdmin.delete(`${API_AGENT_BUILDER}/conversations/${encodeURIComponent(id)}`);
      }
      llmProxy.close();
      await deleteConnectorById(kbnClient, connectorId);
    });

    for (const mode of EXECUTION_MODES) {
      apiTest(
        `[${mode}] recovers when answer agent calls unavailable tool`,
        async ({ apiClient }) => {
          const USER_PROMPT = 'Please do something';
          const MOCKED_LLM_TITLE = 'Mocked conversation title';
          const MOCKED_LLM_RESPONSE = 'Mocked LLM response';

          await setupAnswerAgentCallsInvalidTool({
            proxy: llmProxy,
            title: MOCKED_LLM_TITLE,
            response: MOCKED_LLM_RESPONSE,
          });

          const res = await postConverse(
            apiClient,
            adminCredentials.apiKeyHeader,
            { input: USER_PROMPT, connector_id: connectorId },
            mode
          );
          expect(res).toHaveStatusCode(200);
          const body = res.body as { conversation_id: string; response: { message: string } };
          conversationIds.push(body.conversation_id);
          await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

          expect(body.response.message).toBe(MOCKED_LLM_RESPONSE);
          const retryRequest = llmProxy.interceptedRequests.find(
            (request) => request.matchingInterceptorName === 'final-assistant-response'
          )?.requestBody;
          expect(retryRequest).toBeDefined();
          const messages = (
            retryRequest as { messages: Array<{ role?: string; content?: unknown }> }
          ).messages;
          const lastToolMessage = [...messages]
            .reverse()
            .find((m) => m?.role === 'tool' && typeof m?.content === 'string');
          expect(lastToolMessage).toBeDefined();
          const toolContent = lastToolMessage!.content as string;
          const errorMessage = toolContentToErrorMessage(toolContent);
          expect(String(errorMessage)).toContain(
            'ERROR: tool_not_found - called a tool which was not available'
          );
        }
      );

      apiTest(`[${mode}] regenerate replaces last round`, async ({ apiClient }) => {
        const MOCKED_LLM_RESPONSE_1 = 'Original Response';
        const MOCKED_LLM_RESPONSE_2 = 'Regenerated Response';
        const MOCKED_LLM_TITLE = 'Test Conversation';

        await setupAgentDirectAnswer({
          proxy: llmProxy,
          title: MOCKED_LLM_TITLE,
          response: MOCKED_LLM_RESPONSE_1,
        });
        const first = await postConverse(
          apiClient,
          adminCredentials.apiKeyHeader,
          { input: 'Original user message', connector_id: connectorId },
          mode
        );
        expect(first).toHaveStatusCode(200);
        const conversationId = (first.body as { conversation_id: string }).conversation_id;
        conversationIds.push(conversationId);
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        let conversation = await getConversation(
          apiClient,
          adminCredentials.apiKeyHeader,
          conversationId
        );
        expect(conversation.rounds).toHaveLength(1);
        expect(conversation.rounds[0].response.message).toBe(MOCKED_LLM_RESPONSE_1);

        await setupAgentDirectAnswer({
          proxy: llmProxy,
          continueConversation: true,
          response: MOCKED_LLM_RESPONSE_2,
        });
        const regen = await postConverse(
          apiClient,
          adminCredentials.apiKeyHeader,
          {
            conversation_id: conversationId,
            connector_id: connectorId,
            action: 'regenerate',
            input: 'This should be ignored',
          },
          mode
        );
        expect(regen).toHaveStatusCode(200);
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
        expect((regen.body as { response: { message: string } }).response.message).toBe(
          MOCKED_LLM_RESPONSE_2
        );

        conversation = await getConversation(
          apiClient,
          adminCredentials.apiKeyHeader,
          conversationId
        );
        expect(conversation.rounds).toHaveLength(1);
        expect(conversation.rounds[0].response.message).toBe(MOCKED_LLM_RESPONSE_2);
        expect(conversation.rounds[0].input.message).toBe('Original user message');
      });

      apiTest(`[${mode}] regenerate preserves prior rounds`, async ({ apiClient }) => {
        const RESPONSE_1 = 'First response';
        const RESPONSE_2 = 'Second response';
        const RESPONSE_2_REGENERATED = 'Second response regenerated';
        const MOCKED_LLM_TITLE = 'Test Conversation';

        await setupAgentDirectAnswer({
          proxy: llmProxy,
          title: MOCKED_LLM_TITLE,
          response: RESPONSE_1,
        });
        const round1 = await postConverse(
          apiClient,
          adminCredentials.apiKeyHeader,
          { input: 'First message', connector_id: connectorId },
          mode
        );
        expect(round1).toHaveStatusCode(200);
        const conversationId = (round1.body as { conversation_id: string }).conversation_id;
        conversationIds.push(conversationId);
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        await setupAgentDirectAnswer({
          proxy: llmProxy,
          continueConversation: true,
          response: RESPONSE_2,
        });
        await postConverse(
          apiClient,
          adminCredentials.apiKeyHeader,
          {
            conversation_id: conversationId,
            connector_id: connectorId,
            input: 'Second message',
          },
          mode
        );
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        await setupAgentDirectAnswer({
          proxy: llmProxy,
          continueConversation: true,
          response: RESPONSE_2_REGENERATED,
        });
        await postConverse(
          apiClient,
          adminCredentials.apiKeyHeader,
          {
            conversation_id: conversationId,
            connector_id: connectorId,
            action: 'regenerate',
          },
          mode
        );
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        const conversation = await getConversation(
          apiClient,
          adminCredentials.apiKeyHeader,
          conversationId
        );
        expect(conversation.rounds).toHaveLength(2);
        expect(conversation.rounds[0].response.message).toBe(RESPONSE_1);
        expect(conversation.rounds[0].input.message).toBe('First message');
        expect(conversation.rounds[1].response.message).toBe(RESPONSE_2_REGENERATED);
        expect(conversation.rounds[1].input.message).toBe('Second message');
      });

      apiTest(`[${mode}] regenerate without conversation_id returns 400`, async ({ apiClient }) => {
        const res = await postConverse(
          apiClient,
          adminCredentials.apiKeyHeader,
          { connector_id: connectorId, action: 'regenerate' },
          mode
        );
        expect(res).toHaveStatusCode(400);
        expect(String((res.body as { message?: string }).message)).toContain(
          'conversation_id is required when action is regenerate'
        );
      });
    }
  }
);
