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
import { API_AGENT_BUILDER, COMMON_HEADERS } from '../fixtures/constants';
import { getConversation, postConverse, type ExecutionMode } from '../fixtures/converse_http';

const EXECUTION_MODES: ExecutionMode[] = ['local', 'task_manager'];

apiTest.describe(
  'Agent Builder — converse simple & multi-round API',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
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

    apiTest.afterAll(async ({ apiClient, kbnClient }) => {
      for (const id of conversationIds) {
        await apiClient.delete(`${API_AGENT_BUILDER}/conversations/${encodeURIComponent(id)}`, {
          headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        });
      }
      llmProxy.close();
      await deleteConnectorById(kbnClient, connectorId);
    });

    for (const mode of EXECUTION_MODES) {
      apiTest(
        `[${mode}] simple conversation persists title and response`,
        async ({ apiClient }) => {
          const MOCKED_LLM_RESPONSE = 'Mocked LLM response';
          const MOCKED_LLM_TITLE = 'Mocked Conversation Title';
          await setupAgentDirectAnswer({
            proxy: llmProxy,
            title: MOCKED_LLM_TITLE,
            response: MOCKED_LLM_RESPONSE,
          });

          const res = await postConverse(
            apiClient,
            adminCredentials.apiKeyHeader,
            { input: 'Hello AgentBuilder', connector_id: connectorId },
            mode
          );
          expect(res).toHaveStatusCode(200);
          const body = res.body as { conversation_id: string; response: { message: string } };
          conversationIds.push(body.conversation_id);
          await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

          expect(body.response.message).toBe(MOCKED_LLM_RESPONSE);
          const conversation = await getConversation(
            apiClient,
            adminCredentials.apiKeyHeader,
            body.conversation_id
          );
          expect(conversation.title).toBe(MOCKED_LLM_TITLE);
          expect(conversation.rounds[0].response.message).toBe(MOCKED_LLM_RESPONSE);
        }
      );

      apiTest(`[${mode}] multi-round conversation`, async ({ apiClient }) => {
        const MOCKED_LLM_RESPONSE_1 = 'Response 1';
        const MOCKED_LLM_RESPONSE_2 = 'Response 2';
        const MOCKED_LLM_TITLE = 'Mocked Conversation Title';

        await setupAgentDirectAnswer({
          proxy: llmProxy,
          title: MOCKED_LLM_TITLE,
          response: MOCKED_LLM_RESPONSE_1,
        });
        const first = await postConverse(
          apiClient,
          adminCredentials.apiKeyHeader,
          { input: 'Hello AgentBuilder', connector_id: connectorId },
          mode
        );
        expect(first).toHaveStatusCode(200);
        const conversationId = (first.body as { conversation_id: string }).conversation_id;
        conversationIds.push(conversationId);
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        await setupAgentDirectAnswer({
          proxy: llmProxy,
          continueConversation: true,
          response: MOCKED_LLM_RESPONSE_2,
        });
        const second = await postConverse(
          apiClient,
          adminCredentials.apiKeyHeader,
          {
            input: 'Follow up',
            conversation_id: conversationId,
            connector_id: connectorId,
          },
          mode
        );
        expect(second).toHaveStatusCode(200);
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
        expect((second.body as { response: { message: string } }).response.message).toBe(
          MOCKED_LLM_RESPONSE_2
        );

        const conversation = await getConversation(
          apiClient,
          adminCredentials.apiKeyHeader,
          conversationId
        );
        expect(conversation.rounds).toHaveLength(2);
        expect(conversation.rounds[0].response.message).toBe(MOCKED_LLM_RESPONSE_1);
        expect(conversation.rounds[1].response.message).toBe(MOCKED_LLM_RESPONSE_2);
      });

      apiTest(`[${mode}] invalid converse payload returns 400`, async ({ apiClient }) => {
        const res = await apiClient.post(`${API_AGENT_BUILDER}/converse`, {
          headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
          body: { _execution_mode: mode },
          responseType: 'json',
        });
        expect(res).toHaveStatusCode(400);
      });
    }
  }
);
