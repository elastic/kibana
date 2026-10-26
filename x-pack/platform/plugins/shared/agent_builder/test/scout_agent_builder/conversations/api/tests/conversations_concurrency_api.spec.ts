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
} from '../../../../scout_agent_builder_shared/lib/connector_kbn';
import { setupAgentDirectAnswer } from '../../../../scout_agent_builder_shared/lib/proxy_scenario';
import {
  apiTest,
  API_AGENT_BUILDER,
  getConversation,
  postConverse,
  type ScoutAgentBuilderApiClient,
} from '../fixtures';

apiTest.describe(
  'Agent Builder — concurrent conversation writes API',
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

    const seedConversation = async (apiClient: ScoutAgentBuilderApiClient): Promise<string> => {
      await setupAgentDirectAnswer({
        proxy: llmProxy,
        title: 'Concurrency test',
        response: 'First round',
      });
      const seed = await postConverse(
        apiClient,
        adminCredentials.apiKeyHeader,
        { input: 'Start the conversation', connector_id: connectorId },
        'local'
      );
      expect(seed).toHaveStatusCode(200);

      const { conversation_id: conversationId } = seed.body as { conversation_id: string };
      conversationIds.push(conversationId);
      await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

      return conversationId;
    };

    apiTest(
      'refuses a second converse while a run is active on the same conversation',
      async ({ apiClient }) => {
        const QUESTION_A = 'Question A';
        const QUESTION_B = 'Question B';
        const ANSWER_A = 'Answer A';

        const conversationId = await seedConversation(apiClient);

        const answerA = llmProxy.intercept({
          name: 'busy-answer-A',
          when: (body) => JSON.stringify(body.messages).includes(QUESTION_A),
          responseMock: ANSWER_A,
        });

        const requestA = postConverse(
          apiClient,
          adminCredentials.apiKeyHeader,
          { input: QUESTION_A, conversation_id: conversationId, connector_id: connectorId },
          'local'
        );

        // A is now mid-run and holds the conversation. B needs no interceptor: it must be
        // refused before reaching the LLM, and an unexpected LLM call for it would find no
        // matching interceptor and fail the request instead of hanging.
        await answerA.waitForIntercept();

        const responseB = await postConverse(
          apiClient,
          adminCredentials.apiKeyHeader,
          { input: QUESTION_B, conversation_id: conversationId, connector_id: connectorId },
          'local'
        );

        // wrap_handler only serializes the message and trace id, so the error code and
        // activeExecutionId are not part of the response body.
        expect(responseB).toHaveStatusCode(409);
        expect((responseB.body as { message: string }).message).toContain(
          `Conversation ${conversationId} already has an execution in progress`
        );

        await answerA.completeAfterIntercept();

        const responseA = await requestA;
        expect(responseA).toHaveStatusCode(200);

        const conversation = await getConversation(
          apiClient,
          adminCredentials.apiKeyHeader,
          conversationId
        );

        expect(conversation.rounds).toHaveLength(2);
        expect(conversation.rounds[1].response.message).toBe(ANSWER_A);
        expect(JSON.stringify(conversation.rounds)).not.toContain(QUESTION_B);
      }
    );

    apiTest(
      'reports active_execution on GET while a run is active and omits it after',
      async ({ apiClient }) => {
        const QUESTION = 'Question for the active run';

        const conversationId = await seedConversation(apiClient);

        const answer = llmProxy.intercept({
          name: 'active-execution-answer',
          when: (body) => JSON.stringify(body.messages).includes(QUESTION),
          responseMock: 'Active run answer',
        });

        const request = postConverse(
          apiClient,
          adminCredentials.apiKeyHeader,
          { input: QUESTION, conversation_id: conversationId, connector_id: connectorId },
          'local'
        );

        await answer.waitForIntercept();

        const during = await getConversation(
          apiClient,
          adminCredentials.apiKeyHeader,
          conversationId
        );
        expect(typeof during.active_execution?.execution_id).toBe('string');
        expect(during.active_execution?.execution_id).not.toBe('');

        await answer.completeAfterIntercept();
        expect(await request).toHaveStatusCode(200);

        const after = await getConversation(
          apiClient,
          adminCredentials.apiKeyHeader,
          conversationId
        );
        expect(after.active_execution).toBeUndefined();
      }
    );
  }
);
