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
import { isRelevantSkillsStep } from '@kbn/agent-builder-common';
import {
  createGenAiConnectorForProxy,
  deleteConnectorById,
} from '../../../../scout_agent_builder_shared/lib/connector_kbn';
import { setupAgentDirectAnswer } from '../../../../scout_agent_builder_shared/lib/proxy_scenario';
import { apiTest, API_AGENT_BUILDER, getConversation, postConverse } from '../fixtures';

// Context-aware skill filtering (`relevantSkills`) is gated on BOTH the umbrella
// `agentBuilder:experimentalFeatures` flag (force-enabled by the Scout server config) AND a dedicated
// fast model being configured. The functional Scout suite has no fast inference endpoint, so the
// fast-model guard keeps the feature OFF even though the umbrella flag is on: no round-start selection
// call, no `<relevant_skills>` notification, no `relevant_skills` step — converse behaves exactly as
// it would with the feature off. This spec pins that guard so a regression (e.g. dropping the
// fast-model check) can't silently reintroduce the extra LLM call that previously broke the suite.
// Happy-path coverage lives in unit tests (and, for real end to end, the EIS-backed smoke suite).
apiTest.describe(
  'Agent Builder — relevant-skills stays off without a fast model API',
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
      'does not run skill selection or break converse when no fast model is configured',
      async ({ apiClient }) => {
        // Only title + final answer are mocked — deliberately NO `select_relevant_skills` interceptor.
        // If the guard failed and the feature ran, the extra selection call would greedily consume the
        // final-answer interceptor and the real final answer would 404, failing this test.
        const MOCKED_LLM_RESPONSE = 'Answer with no fast model configured';
        await setupAgentDirectAnswer({
          proxy: llmProxy,
          title: 'No fast model title',
          response: MOCKED_LLM_RESPONSE,
        });

        // The default agent (no agent_id) has `enable_elastic_capabilities`, so it resolves > 3 skills
        // — the condition that WOULD trigger the round-start selection if a fast model were configured.
        const res = await postConverse(
          apiClient,
          adminCredentials.apiKeyHeader,
          { input: 'Hello with the umbrella flag on', connector_id: connectorId },
          'local'
        );

        expect(res).toHaveStatusCode(200);
        const body = res.body as { conversation_id: string; response: { message: string } };
        conversationIds.push(body.conversation_id);
        // Exactly the title + final-answer interceptors ran — proves no extra selection call happened.
        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
        expect(body.response.message).toBe(MOCKED_LLM_RESPONSE);

        // Feature stayed gated off (no fast model): no relevant_skills step persisted on the round.
        const conversation = await getConversation(
          apiClient,
          adminCredentials.apiKeyHeader,
          body.conversation_id
        );
        expect(conversation.rounds[0].steps.some(isRelevantSkillsStep)).toBe(false);
      }
    );
  }
);
