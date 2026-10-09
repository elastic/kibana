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
import { API_AGENT_BUILDER } from '../fixtures/constants';
import { getConversation, postConverse } from '../fixtures/converse_http';

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

    apiTest(
      'keeps both rounds when two clients converse with the same conversation at once',
      async ({ apiClient }) => {
        const FIRST_ROUND = 'First round';
        const QUESTION_A = 'Question A';
        const QUESTION_B = 'Question B';
        const CONCURRENT_A = 'Concurrent answer A';
        const CONCURRENT_B = 'Concurrent answer B';

        // Seed a conversation with one round so both concurrent rounds are appends.
        await setupAgentDirectAnswer({
          proxy: llmProxy,
          title: 'Concurrency test',
          response: FIRST_ROUND,
        });
        const seed = await postConverse(
          apiClient,
          adminCredentials.apiKeyHeader,
          { input: 'Start the conversation', connector_id: connectorId },
          'local'
        );
        expect(seed).toHaveStatusCode(200);
        const conversationId = (seed.body as { conversation_id: string }).conversation_id;
        conversationIds.push(conversationId);
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        // Matched on the prompt rather than on registration order, so each request
        // deterministically gets its own interceptor. A `when: () => true` pair
        // would let either request consume either — and would silently swallow an
        // unexpected extra LLM call, leaving the other request hung on its wait.
        const answerFor = (question: string, answer: string) =>
          llmProxy.intercept({
            name: `concurrent-answer-${question}`,
            when: (body) => JSON.stringify(body.messages).includes(question),
            responseMock: answer,
          });

        const answerA = answerFor(QUESTION_A, CONCURRENT_A);
        const answerB = answerFor(QUESTION_B, CONCURRENT_B);

        const requestA = postConverse(
          apiClient,
          adminCredentials.apiKeyHeader,
          { input: QUESTION_A, conversation_id: conversationId, connector_id: connectorId },
          'local'
        );
        const requestB = postConverse(
          apiClient,
          adminCredentials.apiKeyHeader,
          { input: QUESTION_B, conversation_id: conversationId, connector_id: connectorId },
          'local'
        );

        // Both executions have now read the conversation, so both hold the same
        // two-round snapshot — the window in which a round used to be lost.
        await answerA.waitForIntercept();
        await answerB.waitForIntercept();

        await answerA.completeAfterIntercept();
        await answerB.completeAfterIntercept();

        const [responseA, responseB] = await Promise.all([requestA, requestB]);
        // A 409 here means the losing writer exhausted its conflict retries rather
        // than the test being wrong
        expect(responseA).toHaveStatusCode(200);
        expect(responseB).toHaveStatusCode(200);

        const conversation = await getConversation(
          apiClient,
          adminCredentials.apiKeyHeader,
          conversationId
        );

        expect(conversation.rounds).toHaveLength(3);

        const messages = conversation.rounds.map(({ response }) => response.message);
        // asserted as a set: which request got which answer is not pinned
        expect(messages).toContain(FIRST_ROUND);
        expect(messages).toContain(CONCURRENT_A);
        expect(messages).toContain(CONCURRENT_B);

        // Round ids stay unique, so a retried write cannot duplicate a round.
        const roundIds = conversation.rounds.map(({ id }) => id);
        expect(new Set(roundIds).size).toBe(roundIds.length);
      }
    );
  }
);
