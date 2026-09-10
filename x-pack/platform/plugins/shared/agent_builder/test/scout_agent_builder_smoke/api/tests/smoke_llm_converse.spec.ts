/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { isToolCallStep, platformCoreTools } from '@kbn/agent-builder-common';
import type {
  AvailableConnectorWithId,
  LlmSmokeFailureEvidence,
} from '@kbn/gen-ai-functional-testing';
import {
  MAX_LLM_SMOKE_JUDGES,
  getAvailableConnectors,
  takeRandomLlmSample,
} from '@kbn/gen-ai-functional-testing';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { ChatRequestBodyPayload, ChatResponse } from '../../../../common/http_api/chat';

import { apiTest } from '../fixtures';
import { API_AGENT_BUILDER } from '../fixtures/constants';
import type { AuthedApiClient } from '../../../scout_agent_builder_shared/lib/authed_api_client';
import {
  enableCcmForScoutSmokeTests,
  getPreDiscoveredEisModelsForScout,
  type DiscoveredEisModel,
} from '../../lib/eis_smoke_for_scout_tests';
import { triageLlmSmokeFailure } from '../../lib/llm_smoke_triage';

const EIS_CCM_API_KEY_ENV = 'KIBANA_EIS_CCM_API_KEY';

const eisCcmKeyMissingReason = `${EIS_CCM_API_KEY_ENV} not set. For local dev: export ${EIS_CCM_API_KEY_ENV}="$(vault read -field key secret/kibana-issues/dev/inference/kibana-eis-ccm)"`;

const EXCLUDED_STATIC_CONNECTOR_IDS = new Set<string>([
  'bedrock-claude-sonnet-3-7',
  // TODO: re-enable once the AWS accessKey in the ai-infra-ci-connectors vault entry is rotated. Currently returns 403
  'bedrock-claude-sonnet-4-5',
]);

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

const ensureEisCcmIfNeeded = async (esClient: Client) => {
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

/** Backup judge endpoints for failure triage, excluding the model under test. */
const judgeInferenceIdsFor = (excludeModelId?: string): string[] =>
  allEisModels
    .filter((model) => model.modelId !== excludeModelId)
    .map((model) => model.inferenceId)
    .slice(0, MAX_LLM_SMOKE_JUDGES);

/**
 * Sends a converse request and runs the standard assertions. On failure, an LLM judge
 * (invoked directly against ES inference endpoints, bypassing Kibana) classifies the
 * failure: provider-side failures skip the test instead of failing CI, anything else
 * rethrows the original failure.
 */
const judgedConverse = async (
  client: AuthedApiClient,
  esClient: Client,
  {
    target,
    scenario,
    payload,
    judgeExcludeModelId,
    extraAssert,
  }: {
    target: string;
    scenario: string;
    payload: ChatRequestBodyPayload;
    judgeExcludeModelId?: string;
    extraAssert?: (body: ChatResponse) => void;
  }
): Promise<ChatResponse> => {
  let response: Awaited<ReturnType<AuthedApiClient['post']>> | undefined;
  try {
    response = await client.post(`${API_AGENT_BUILDER}/converse`, {
      body: payload,
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(200);
    const body = response.body as ChatResponse;
    expectNonEmptyReply(body);
    extraAssert?.(body);
    return body;
  } catch (error) {
    const evidence: LlmSmokeFailureEvidence = {
      target,
      scenario,
      statusCode: response?.statusCode,
      responseBody: response ? JSON.stringify(response.body) : undefined,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
    const judgement = await triageLlmSmokeFailure({
      esClient,
      evidence,
      judgeInferenceIds: judgeInferenceIdsFor(judgeExcludeModelId),
      ensureJudgeReady: () => ensureEisCcmIfNeeded(esClient),
    });
    // eslint-disable-next-line playwright/no-skipped-test
    apiTest.skip(
      judgement.verdict === 'provider',
      `LLM provider failure (judged by ${judgement.judgeInferenceId}): ${judgement.reason}`
    );
    throw error;
  }
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
      apiTest(
        `static connector ${connector.id} — simple message`,
        async ({ asAdmin, esClient }) => {
          apiTest.skip(
            !selectedStaticConnectorIds.has(connector.id),
            'not in FTR_GEN_AI_LLM_SAMPLE'
          );
          await judgedConverse(asAdmin, esClient, {
            target: connector.id,
            scenario: 'simple message',
            payload: {
              input: 'Hello',
              connector_id: connector.id,
            } satisfies ChatRequestBodyPayload,
          });
        }
      );

      apiTest(`static connector ${connector.id} — tool call`, async ({ asAdmin, esClient }) => {
        // eslint-disable-next-line playwright/no-skipped-test
        apiTest.skip(!selectedStaticConnectorIds.has(connector.id), 'not in FTR_GEN_AI_LLM_SAMPLE');
        await judgedConverse(asAdmin, esClient, {
          target: connector.id,
          scenario: 'tool call',
          payload: {
            input: `Using the "platform_core_list_indices" tool, please list my indices. Only call the tool once.`,
            connector_id: connector.id,
          } satisfies ChatRequestBodyPayload,
          extraAssert: expectListIndicesToolCalled,
        });
      });

      apiTest(
        `static connector ${connector.id} — conversation continue`,
        async ({ asAdmin, esClient }) => {
          // eslint-disable-next-line playwright/no-skipped-test
          apiTest.skip(
            !selectedStaticConnectorIds.has(connector.id),
            'not in FTR_GEN_AI_LLM_SAMPLE'
          );
          const id = connector.id;
          const body1 = await judgedConverse(asAdmin, esClient, {
            target: id,
            scenario: 'conversation continue — first message',
            payload: {
              input: 'Please say "hello"',
              connector_id: id,
            } satisfies ChatRequestBodyPayload,
          });

          const body2 = await judgedConverse(asAdmin, esClient, {
            target: id,
            scenario: 'conversation continue — follow-up',
            payload: {
              conversation_id: body1.conversation_id,
              input: 'Please say it again.',
              connector_id: id,
            } satisfies ChatRequestBodyPayload,
          });
          expect(body2.conversation_id).toBe(body1.conversation_id);
        }
      );
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
          await judgedConverse(asAdmin, esClient, {
            target: connectorId,
            scenario: 'simple message',
            judgeExcludeModelId: model.modelId,
            payload: {
              input: 'Hello',
              connector_id: connectorId,
            } satisfies ChatRequestBodyPayload,
          });
        });

        apiTest(`EIS ${model.modelId} — tool call`, async ({ asAdmin, esClient }) => {
          // eslint-disable-next-line playwright/no-skipped-test
          apiTest.skip(!selectedEisModelIds.has(model.modelId), 'not in FTR_GEN_AI_LLM_SAMPLE');
          await ensureEisCcmIfNeeded(esClient);
          await judgedConverse(asAdmin, esClient, {
            target: connectorId,
            scenario: 'tool call',
            judgeExcludeModelId: model.modelId,
            payload: {
              input: `Using the "platform_core_list_indices" tool, please list my indices. Only call the tool once.`,
              connector_id: connectorId,
            } satisfies ChatRequestBodyPayload,
            extraAssert: expectListIndicesToolCalled,
          });
        });

        apiTest(`EIS ${model.modelId} — conversation continue`, async ({ asAdmin, esClient }) => {
          // eslint-disable-next-line playwright/no-skipped-test
          apiTest.skip(!selectedEisModelIds.has(model.modelId), 'not in FTR_GEN_AI_LLM_SAMPLE');
          await ensureEisCcmIfNeeded(esClient);
          const body1 = await judgedConverse(asAdmin, esClient, {
            target: connectorId,
            scenario: 'conversation continue — first message',
            judgeExcludeModelId: model.modelId,
            payload: {
              input: 'Please say "hello"',
              connector_id: connectorId,
            } satisfies ChatRequestBodyPayload,
          });

          const body2 = await judgedConverse(asAdmin, esClient, {
            target: connectorId,
            scenario: 'conversation continue — follow-up',
            judgeExcludeModelId: model.modelId,
            payload: {
              conversation_id: body1.conversation_id,
              input: 'Please say it again.',
              connector_id: connectorId,
            } satisfies ChatRequestBodyPayload,
          });
          expect(body2.conversation_id).toBe(body1.conversation_id);
        });
      }
    }
  }
);
