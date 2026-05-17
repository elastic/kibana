/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isToolCallStep, platformCoreTools } from '@kbn/agent-builder-common';
import type { AvailableConnectorWithId } from '@kbn/gen-ai-functional-testing';
import { getAvailableConnectors, takeRandomLlmSample } from '@kbn/gen-ai-functional-testing';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { ChatRequestBodyPayload, ChatResponse } from '../../../../common/http_api/chat';

import { apiTest } from '../fixtures';
import { API_AGENT_BUILDER } from '../fixtures/constants';
import {
  enableCcmForScoutSmokeTests,
  getPreDiscoveredEisModelsForScout,
  type DiscoveredEisModel,
} from '../../lib/eis_smoke_for_scout_tests';

const EIS_CCM_API_KEY_ENV = 'KIBANA_EIS_CCM_API_KEY';

const eisCcmKeyMissingReason = `${EIS_CCM_API_KEY_ENV} not set. For local dev: export ${EIS_CCM_API_KEY_ENV}="$(vault read -field key secret/kibana-issues/dev/inference/kibana-eis-ccm)"`;

const EXCLUDED_STATIC_CONNECTOR_IDS = new Set<string>(['bedrock-claude-sonnet-3-7']);

const safeGetAvailableConnectors = (): AvailableConnectorWithId[] => {
  try {
    return getAvailableConnectors();
  } catch {
    return [];
  }
};

const allStaticConnectors: AvailableConnectorWithId[] = safeGetAvailableConnectors().filter(
  (c) => !EXCLUDED_STATIC_CONNECTOR_IDS.has(c.id)
);
const allEisModels: DiscoveredEisModel[] = getPreDiscoveredEisModelsForScout();

let eisCcmConfigured = false;

const expectNonEmptyReply = (response: ChatResponse) => {
  const hasTextReply = Boolean(response.response.message?.trim().length);
  const hasConversationSteps = response.steps.length > 0;
  expect(hasTextReply || hasConversationSteps).toBe(true);
};

const expectListIndicesToolCalled = (body: ChatResponse) => {
  const toolCalls = body.steps.filter(isToolCallStep);

  // eslint-disable-next-line playwright/prefer-comparison-matcher -- match FTR `>= 1`
  expect(toolCalls.length >= 1).toBe(true);
  expect(toolCalls[0].tool_id).toBe(platformCoreTools.listIndices);
};

const ensureEisCcmIfNeeded = async (
  esClient: Parameters<typeof enableCcmForScoutSmokeTests>[0]
) => {
  if (allEisModels.length === 0 || eisCcmConfigured) {
    return;
  }
  const apiKey = process.env[EIS_CCM_API_KEY_ENV];
  if (!apiKey) {
    throw new Error(eisCcmKeyMissingReason);
  }
  await enableCcmForScoutSmokeTests(esClient, apiKey);
  eisCcmConfigured = true;
};

apiTest.describe(
  'Agent Builder — LLM smoke (converse API)',
  { tag: [...tags.stateful.classic] },
  () => {
    apiTest.setTimeout(300_000);

    let selectedStaticConnectorIds: ReadonlySet<string> = new Set();
    let selectedEisModelIds: ReadonlySet<string> = new Set();

    apiTest.beforeAll(async () => {
      const sampledStaticConnectors = takeRandomLlmSample(allStaticConnectors);
      const sampledEisModels = takeRandomLlmSample(allEisModels);
      selectedStaticConnectorIds = new Set(sampledStaticConnectors.map((c) => c.id));
      selectedEisModelIds = new Set(sampledEisModels.map((m) => m.modelId));

      process.stdout.write(
        `[Scout] LLM smoke — static connectors (${sampledStaticConnectors.length}/${
          allStaticConnectors.length
        }): ${sampledStaticConnectors.map((c) => c.id).join(', ')}\n`
      );
      process.stdout.write(
        `[Scout] LLM smoke — EIS models (${sampledEisModels.length}/${
          allEisModels.length
        }): ${sampledEisModels.map((m) => m.modelId).join(', ')}\n`
      );
    });

    for (const connector of allStaticConnectors) {
      apiTest(`static connector ${connector.id} — simple message`, async ({ asAdmin }) => {
        apiTest.skip(!selectedStaticConnectorIds.has(connector.id), 'not in FTR_GEN_AI_LLM_SAMPLE');
        const response = await asAdmin.post(`${API_AGENT_BUILDER}/converse`, {
          body: {
            input: 'Hello',
            connector_id: connector.id,
          } satisfies ChatRequestBodyPayload,
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        expectNonEmptyReply(response.body as ChatResponse);
      });

      apiTest(`static connector ${connector.id} — tool call`, async ({ asAdmin }) => {
        // eslint-disable-next-line playwright/no-skipped-test
        apiTest.skip(!selectedStaticConnectorIds.has(connector.id), 'not in FTR_GEN_AI_LLM_SAMPLE');
        const response = await asAdmin.post(`${API_AGENT_BUILDER}/converse`, {
          body: {
            input: `Using the "platform_core_list_indices" tool, please list my indices. Only call the tool once.`,
            connector_id: connector.id,
          } satisfies ChatRequestBodyPayload,
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        const body = response.body as ChatResponse;
        expectNonEmptyReply(body);
        expectListIndicesToolCalled(body);
      });

      apiTest(`static connector ${connector.id} — conversation continue`, async ({ asAdmin }) => {
        // eslint-disable-next-line playwright/no-skipped-test
        apiTest.skip(!selectedStaticConnectorIds.has(connector.id), 'not in FTR_GEN_AI_LLM_SAMPLE');
        const id = connector.id;
        const response1 = await asAdmin.post(`${API_AGENT_BUILDER}/converse`, {
          body: {
            input: 'Please say "hello"',
            connector_id: id,
          } satisfies ChatRequestBodyPayload,
          responseType: 'json',
        });
        expect(response1).toHaveStatusCode(200);
        expectNonEmptyReply(response1.body as ChatResponse);

        const response2 = await asAdmin.post(`${API_AGENT_BUILDER}/converse`, {
          body: {
            conversation_id: (response1.body as ChatResponse).conversation_id,
            input: 'Please say it again.',
            connector_id: id,
          } satisfies ChatRequestBodyPayload,
          responseType: 'json',
        });
        expect(response2).toHaveStatusCode(200);
        expectNonEmptyReply(response2.body as ChatResponse);
        expect((response2.body as ChatResponse).conversation_id).toBe(
          (response1.body as ChatResponse).conversation_id
        );
      });
    }

    if (allEisModels.length === 0) {
      /* eslint-disable @kbn/eslint/scout_require_api_client_in_api_test -- FTR `index.ts`: skip-only it (log + skip, no HTTP) */
      // eslint-disable-next-line playwright/expect-expect
      apiTest('should skip - no EIS models discovered', async () => {
        process.stdout.write('[EIS] No models in target/eis_models.json\n');
        process.stdout.write('[EIS] Run: node scripts/discover_eis_models.js\n');
        // eslint-disable-next-line playwright/no-skipped-test
        apiTest.skip(true, 'no EIS models discovered');
      });
      /* eslint-enable @kbn/eslint/scout_require_api_client_in_api_test */
    } else {
      for (const model of allEisModels) {
        const connectorId = `eis-${model.modelId}`;

        apiTest(`EIS ${model.modelId} — simple message`, async ({ asAdmin, esClient }) => {
          // eslint-disable-next-line playwright/no-skipped-test
          apiTest.skip(!selectedEisModelIds.has(model.modelId), 'not in FTR_GEN_AI_LLM_SAMPLE');
          await ensureEisCcmIfNeeded(esClient);
          const response = await asAdmin.post(`${API_AGENT_BUILDER}/converse`, {
            body: {
              input: 'Hello',
              connector_id: connectorId,
            } satisfies ChatRequestBodyPayload,
            responseType: 'json',
          });
          expect(response).toHaveStatusCode(200);
          expectNonEmptyReply(response.body as ChatResponse);
        });

        apiTest(`EIS ${model.modelId} — tool call`, async ({ asAdmin, esClient }) => {
          // eslint-disable-next-line playwright/no-skipped-test
          apiTest.skip(!selectedEisModelIds.has(model.modelId), 'not in FTR_GEN_AI_LLM_SAMPLE');
          await ensureEisCcmIfNeeded(esClient);
          const response = await asAdmin.post(`${API_AGENT_BUILDER}/converse`, {
            body: {
              input: `Using the "platform_core_list_indices" tool, please list my indices. Only call the tool once.`,
              connector_id: connectorId,
            } satisfies ChatRequestBodyPayload,
            responseType: 'json',
          });
          expect(response).toHaveStatusCode(200);
          const body = response.body as ChatResponse;
          expectNonEmptyReply(body);
          expectListIndicesToolCalled(body);
        });

        apiTest(`EIS ${model.modelId} — conversation continue`, async ({ asAdmin, esClient }) => {
          // eslint-disable-next-line playwright/no-skipped-test
          apiTest.skip(!selectedEisModelIds.has(model.modelId), 'not in FTR_GEN_AI_LLM_SAMPLE');
          await ensureEisCcmIfNeeded(esClient);
          const response1 = await asAdmin.post(`${API_AGENT_BUILDER}/converse`, {
            body: {
              input: 'Please say "hello"',
              connector_id: connectorId,
            } satisfies ChatRequestBodyPayload,
            responseType: 'json',
          });
          expect(response1).toHaveStatusCode(200);
          expectNonEmptyReply(response1.body as ChatResponse);

          const response2 = await asAdmin.post(`${API_AGENT_BUILDER}/converse`, {
            body: {
              conversation_id: (response1.body as ChatResponse).conversation_id,
              input: 'Please say it again.',
              connector_id: connectorId,
            } satisfies ChatRequestBodyPayload,
            responseType: 'json',
          });
          expect(response2).toHaveStatusCode(200);
          expectNonEmptyReply(response2.body as ChatResponse);
          expect((response2.body as ChatResponse).conversation_id).toBe(
            (response1.body as ChatResponse).conversation_id
          );
        });
      }
    }
  }
);
