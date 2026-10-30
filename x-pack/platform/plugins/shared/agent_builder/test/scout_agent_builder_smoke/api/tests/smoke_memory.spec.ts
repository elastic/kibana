/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { LlmSmokeFailureEvidence } from '@kbn/gen-ai-functional-testing';
import { MAX_LLM_SMOKE_JUDGES } from '@kbn/gen-ai-functional-testing';
import { CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { randomBytes, randomUUID } from 'crypto';
import type { ChatRequestBodyPayload, ChatResponse } from '../../../../common/http_api/chat';
import type { AuthedApiClient } from '../../../scout_agent_builder_shared/lib/authed_api_client';
import { apiTest } from '../fixtures';
import { API_AGENT_BUILDER } from '../fixtures/constants';
import {
  enableCcmForScoutSmokeTests,
  getPreDiscoveredEisModelsForScout,
} from '../../lib/eis_smoke_for_scout_tests';
import { triageLlmSmokeFailure } from '../../lib/llm_smoke_triage';

const AI_INDEX_COLLECTION_PATH = '/api/context_engine/ai_index';
const EIS_CCM_API_KEY_ENV = 'KIBANA_EIS_CCM_API_KEY';
const RUN_ID = randomBytes(6).toString('hex');
const AI_INDEX_ID = `memory-smoke-${RUN_ID}`;
const DESTINATION_INDEX = `ai-index-idx-${AI_INDEX_ID}`;
const AGENT_ID = `memory-smoke-${RUN_ID}`;
const PROJECT_LABEL = `project-${randomBytes(4).toString('hex')}`;
const SECRET_TOKEN = `cobalt-${randomBytes(6).toString('hex')}`;
const CONVERSATION_IDS = [randomUUID(), randomUUID()] as const;
const API_HEADERS = { 'elastic-api-version': '2023-10-31' };
const LIVE_MEMORY_TEST_TIMEOUT = 16 * 60 * 1000;

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined;

const getEisInferenceIds = async (esClient: Client): Promise<string[]> => {
  const response = await esClient.inference.get({ inference_id: '_all' });
  const endpoints = response.endpoints as Array<{
    inference_id: string;
    service: string;
    task_type: string;
  }>;
  return endpoints
    .filter(({ service, task_type: taskType }) => {
      return service === 'elastic' && taskType === 'chat_completion';
    })
    .map(({ inference_id: inferenceId }) => inferenceId);
};

const deleteApiResource = async (
  client: AuthedApiClient,
  path: string,
  expectedStatuses: readonly number[]
): Promise<void> => {
  const response = await client.delete(path, {
    headers: API_HEADERS,
    responseType: 'json',
  });
  if (!expectedStatuses.includes(response.statusCode)) {
    throw new Error(`HTTP ${response.statusCode}: ${JSON.stringify(response.body)}`);
  }
};

const createFailureEvidence = ({
  inferenceId,
  response,
  error,
}: {
  inferenceId: string;
  response: Awaited<ReturnType<AuthedApiClient['post']>> | undefined;
  error: unknown;
}): LlmSmokeFailureEvidence => ({
  target: inferenceId,
  scenario: 'cross-conversation Memory write and recall',
  statusCode: response?.statusCode,
  responseBody: response ? JSON.stringify(response.body) : undefined,
  errorMessage: error instanceof Error ? error.message : String(error),
});

apiTest.describe(
  'Agent Builder — live EIS Memory smoke',
  { tag: [...tags.stateful.classic] },
  () => {
    apiTest.setTimeout(LIVE_MEMORY_TEST_TIMEOUT);

    let previousMemoryEnabled: boolean | undefined;
    let memorySettingChanged = false;
    let eisInferenceIds: string[] = [];
    let selectedInferenceId: string | undefined;

    apiTest.beforeAll(async ({ asAdmin, esClient, kbnClient }) => {
      const globalSettingsResponse = await asAdmin.get('/internal/kibana/global_settings', {
        responseType: 'json',
      });
      expect(globalSettingsResponse).toHaveStatusCode(200);
      previousMemoryEnabled =
        globalSettingsResponse.body.settings?.[CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID]?.userValue;
      await kbnClient.uiSettings.updateGlobal({
        [CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID]: true,
      });
      await kbnClient.uiSettings.waitForEventualCacheRefresh();
      memorySettingChanged = true;

      eisInferenceIds = await getEisInferenceIds(esClient);
      if (eisInferenceIds.length === 0) {
        const apiKey = process.env[EIS_CCM_API_KEY_ENV];
        if (!apiKey) {
          throw new Error(
            `No EIS chat-completion endpoints are available. For local development, start Elasticsearch with EIS configured and run node scripts/eis.js. In CI, ${EIS_CCM_API_KEY_ENV} must be set.`
          );
        }
        await enableCcmForScoutSmokeTests(esClient, apiKey);
        eisInferenceIds = await getEisInferenceIds(esClient);
      }
      if (eisInferenceIds.length === 0) {
        throw new Error('No EIS chat-completion endpoints became available.');
      }

      const discoveredInferenceIds = new Set(
        getPreDiscoveredEisModelsForScout().map(({ inferenceId }) => inferenceId)
      );
      const eligibleInferenceIds = eisInferenceIds.filter((inferenceId) => {
        return discoveredInferenceIds.size === 0 || discoveredInferenceIds.has(inferenceId);
      });
      const availableInferenceIds =
        eligibleInferenceIds.length > 0 ? eligibleInferenceIds : eisInferenceIds;
      const preferredSonnetIds = availableInferenceIds
        .filter((inferenceId) => {
          return inferenceId.includes('anthropic-claude') && inferenceId.includes('sonnet');
        })
        .sort();
      selectedInferenceId = preferredSonnetIds.at(-1) ?? availableInferenceIds[0];

      const aiIndexResponse = await asAdmin.put(`${AI_INDEX_COLLECTION_PATH}/${AI_INDEX_ID}`, {
        headers: API_HEADERS,
        responseType: 'json',
        body: {
          dest: { type: 'index', value: DESTINATION_INDEX },
          memory_enabled: true,
          automations: [],
          sources: [],
          traces: [],
        },
      });
      expect(aiIndexResponse).toHaveStatusCode(201);

      const agentResponse = await asAdmin.post(`${API_AGENT_BUILDER}/agents`, {
        headers: API_HEADERS,
        responseType: 'json',
        body: {
          id: AGENT_ID,
          name: 'Memory smoke test agent',
          description: 'Disposable agent for testing cross-conversation Memory.',
          configuration: {
            tools: [],
            enable_elastic_capabilities: false,
            ai_indices: [AI_INDEX_ID],
          },
        },
      });
      expect(agentResponse).toHaveStatusCode(200);
    });

    apiTest.afterAll(async ({ asAdmin, esClient, kbnClient }) => {
      const cleanupErrors: string[] = [];
      const cleanup = async (label: string, operation: () => Promise<void>) => {
        try {
          await operation();
        } catch (error) {
          cleanupErrors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
        }
      };

      for (const conversationId of CONVERSATION_IDS) {
        await cleanup(`conversation ${conversationId}`, async () => {
          await deleteApiResource(
            asAdmin,
            `${API_AGENT_BUILDER}/conversations/${encodeURIComponent(conversationId)}`,
            [200, 404]
          );
        });
      }
      await cleanup(`agent ${AGENT_ID}`, async () => {
        await deleteApiResource(
          asAdmin,
          `${API_AGENT_BUILDER}/agents/${encodeURIComponent(AGENT_ID)}`,
          [200, 404]
        );
      });
      await cleanup(`AI index ${AI_INDEX_ID}`, async () => {
        const response = await asAdmin.delete(
          `${AI_INDEX_COLLECTION_PATH}/${encodeURIComponent(
            AI_INDEX_ID
          )}?delete_knowledge_indicators=true`,
          { headers: API_HEADERS, responseType: 'json' }
        );
        if (response.statusCode === 200) {
          const body = asRecord(response.body);
          const errors = Array.isArray(body?.errors) ? body.errors : [];
          if (body?.acknowledged !== true || errors.length > 0) {
            throw new Error(JSON.stringify(response.body));
          }
        } else if (response.statusCode !== 404) {
          throw new Error(`HTTP ${response.statusCode}: ${JSON.stringify(response.body)}`);
        }
      });
      await cleanup(`backing index ${DESTINATION_INDEX}`, async () => {
        await esClient.indices.delete({ index: DESTINATION_INDEX }, { ignore: [404] });
      });

      if (memorySettingChanged) {
        await cleanup('global Memory setting', async () => {
          if (previousMemoryEnabled === undefined) {
            await deleteApiResource(
              asAdmin,
              `/internal/kibana/global_settings/${encodeURIComponent(
                CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID
              )}`,
              [200]
            );
          } else {
            await kbnClient.uiSettings.updateGlobal({
              [CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID]: previousMemoryEnabled,
            });
          }
          await kbnClient.uiSettings.waitForEventualCacheRefresh();
        });
      }

      if (cleanupErrors.length > 0) {
        throw new Error(`Memory smoke cleanup failed:\n${cleanupErrors.join('\n')}`);
      }
    });

    apiTest(
      'stores a fact and recalls it naturally in a new conversation',
      async ({ asAdmin, esClient }) => {
        expect(selectedInferenceId).toBeDefined();
        const inferenceId = selectedInferenceId as string;
        let lastResponse: Awaited<ReturnType<AuthedApiClient['post']>> | undefined;

        const converse = async (conversationId: string, input: string): Promise<ChatResponse> => {
          const payload = {
            conversation_id: conversationId,
            input,
            agent_id: AGENT_ID,
            inference_id: inferenceId,
            _execution_mode: 'local',
          } satisfies ChatRequestBodyPayload;
          lastResponse = await asAdmin.post(`${API_AGENT_BUILDER}/converse`, {
            headers: API_HEADERS,
            body: payload,
            responseType: 'json',
          });
          expect(lastResponse).toHaveStatusCode(200);
          return lastResponse.body as ChatResponse;
        };

        try {
          const remember = await converse(
            CONVERSATION_IDS[0],
            `Remember this for later: ${PROJECT_LABEL}'s deployment code is ${SECRET_TOKEN}.`
          );
          expect(remember.conversation_id).toBe(CONVERSATION_IDS[0]);
          expect(eisInferenceIds).toContain(remember.model_usage.connector_id);

          const recallPrompt = `What is ${PROJECT_LABEL}'s deployment code?`;
          expect(recallPrompt).not.toContain(SECRET_TOKEN);
          const recall = await converse(CONVERSATION_IDS[1], recallPrompt);
          expect(recall.conversation_id).toBe(CONVERSATION_IDS[1]);
          expect(recall.conversation_id).not.toBe(remember.conversation_id);
          expect(eisInferenceIds).toContain(recall.model_usage.connector_id);
          expect(recall.response.message?.toLowerCase()).toContain(SECRET_TOKEN.toLowerCase());
        } catch (error) {
          const evidence = createFailureEvidence({
            inferenceId,
            response: lastResponse,
            error,
          });
          const judgement = await triageLlmSmokeFailure({
            esClient,
            evidence,
            judgeInferenceIds: eisInferenceIds
              .filter((candidate) => candidate !== inferenceId)
              .slice(0, MAX_LLM_SMOKE_JUDGES),
            ensureJudgeReady: async () => undefined,
          });
          // eslint-disable-next-line playwright/no-skipped-test
          apiTest.skip(
            judgement.verdict === 'provider',
            `LLM provider failure (judged by ${judgement.judgeInferenceId}): ${judgement.reason}`
          );
          throw error;
        }
      }
    );
  }
);
