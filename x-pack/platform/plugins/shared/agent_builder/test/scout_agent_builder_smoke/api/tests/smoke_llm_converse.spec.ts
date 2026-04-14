/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

import type { Client } from '@elastic/elasticsearch';
import { isToolCallStep, platformCoreTools } from '@kbn/agent-builder-common';
import type { AvailableConnectorWithId } from '@kbn/gen-ai-functional-testing';
import {
  getAvailableConnectors,
  takeRandomLlmSample,
  AI_CONNECTORS_VAR_ENV,
} from '@kbn/gen-ai-functional-testing';
import { REPO_ROOT } from '@kbn/repo-info';
import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { ChatRequestBodyPayload, ChatResponse } from '../../../../common/http_api/chat';

import { apiTest } from '../fixtures';
import { API_AGENT_BUILDER, COMMON_HEADERS } from '../fixtures/constants';

const EIS_CCM_API_KEY_ENV = 'KIBANA_EIS_CCM_API_KEY';
const EIS_MODELS_PATH = resolve(REPO_ROOT, 'target/eis_models.json');

interface DiscoveredModel {
  inferenceId: string;
  modelId: string;
  metadata?: {
    heuristics?: {
      properties?: string[];
    };
  };
}

const getPreDiscoveredEisModels = (): DiscoveredModel[] => {
  if (!existsSync(EIS_MODELS_PATH)) {
    return [];
  }
  try {
    const data = JSON.parse(readFileSync(EIS_MODELS_PATH, 'utf8')) as {
      models?: DiscoveredModel[];
    };
    const models = data.models ?? [];
    return models.filter((model) => !model.metadata?.heuristics?.properties?.includes('efficient'));
  } catch {
    return [];
  }
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const enableCcm = async (es: Client, apiKey: string): Promise<void> => {
  process.stdout.write('[EIS] Enabling Cloud Connected Mode...\n');
  await es.transport.request({
    method: 'PUT',
    path: '/_inference/_ccm',
    body: { api_key: apiKey },
  });
  process.stdout.write('[EIS] ✅ CCM enabled\n');

  process.stdout.write('[EIS] Waiting for EIS endpoints to be provisioned...\n');
  const maxRetries = 5;
  const retryDelayMs = 3000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await es.inference.get({ inference_id: '_all' });
    const endpoints = response.endpoints as Array<{ task_type: string; service: string }>;
    const eisEndpoints = endpoints.filter(
      (ep) => ep.task_type === 'chat_completion' && ep.service === 'elastic'
    );

    if (eisEndpoints.length > 0) {
      process.stdout.write(
        `[EIS] ✅ Found ${eisEndpoints.length} EIS endpoints on attempt ${attempt}\n`
      );
      return;
    }
    if (attempt < maxRetries) {
      process.stdout.write(
        `[EIS] No endpoints yet (attempt ${attempt}/${maxRetries}), waiting...\n`
      );
      await sleep(retryDelayMs);
    }
  }

  process.stderr.write('[EIS] ⚠️ No EIS endpoints found after waiting\n');
};

const expectNonEmptyReply = (response: ChatResponse) => {
  const hasTextReply = Boolean(response.response.message?.trim().length);
  const hasConversationSteps = response.steps.length > 0;
  expect(hasTextReply || hasConversationSteps).toBe(true);
};

const expectListIndicesToolCalled = (body: ChatResponse) => {
  const toolCalls = body.steps.filter(isToolCallStep);
  expect(toolCalls.length).toBeGreaterThan(0);
  expect(toolCalls.some((step) => step.tool_id === platformCoreTools.listIndices)).toBe(true);
};

apiTest.describe(
  'Agent Builder — LLM smoke (converse API)',
  { tag: [...tags.stateful.classic] },
  () => {
    apiTest.setTimeout(300_000);

    let staticConnectorLoadError: string | undefined;
    let sampledStaticConnectors: AvailableConnectorWithId[] = [];
    try {
      sampledStaticConnectors = takeRandomLlmSample(getAvailableConnectors());
    } catch (e) {
      staticConnectorLoadError =
        e instanceof Error
          ? e.message
          : `Failed to load static connectors (${AI_CONNECTORS_VAR_ENV} / kibana.dev.yml)`;
      sampledStaticConnectors = [];
    }

    const allEisModels = getPreDiscoveredEisModels();
    const sampledEisModels = takeRandomLlmSample(allEisModels);
    const eisCcmApiKey = process.env[EIS_CCM_API_KEY_ENV];

    let adminCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth, esClient, apiClient }) => {
      adminCredentials = await requestAuth.getApiKeyForAdmin();
      const warmup = await apiClient.get('/api/actions/connectors', {
        headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
      });
      expect(warmup).toHaveStatusCode(200);

      if (allEisModels.length === 0 || !eisCcmApiKey) {
        return;
      }
      await enableCcm(esClient, eisCcmApiKey);
    });

    const staticConnectorsSkippedReason =
      staticConnectorLoadError ??
      `No static connectors sampled (set ${AI_CONNECTORS_VAR_ENV} or config/kibana.dev.yml)`;

    const eisModelsMissingReason =
      '[EIS] No models in target/eis_models.json — run: node scripts/discover_eis_models.js';

    const eisCcmKeyMissingReason = `${EIS_CCM_API_KEY_ENV} not set. For local dev: export ${EIS_CCM_API_KEY_ENV}="$(vault read -field key secret/kibana-issues/dev/inference/kibana-eis-ccm)"`;

    if (sampledStaticConnectors.length === 0) {
      apiTest('static preconfigured connectors — skipped', async ({ apiClient }, testInfo) => {
        const warmup = await apiClient.get('/api/actions/connectors', {
          headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        });
        expect(warmup).toHaveStatusCode(200);
        testInfo.skip(true, staticConnectorsSkippedReason);
      });
    } else {
      for (const connector of sampledStaticConnectors) {
        apiTest(`static connector ${connector.id} — simple message`, async ({ apiClient }) => {
          const response = await apiClient.post(`${API_AGENT_BUILDER}/converse`, {
            headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
            body: {
              input: 'Hello',
              connector_id: connector.id,
            } satisfies ChatRequestBodyPayload,
            responseType: 'json',
          });
          expect(response).toHaveStatusCode(200);
          expectNonEmptyReply(response.body as ChatResponse);
        });

        apiTest(`static connector ${connector.id} — tool call`, async ({ apiClient }) => {
          const response = await apiClient.post(`${API_AGENT_BUILDER}/converse`, {
            headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
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

        apiTest(
          `static connector ${connector.id} — conversation continue`,
          async ({ apiClient }) => {
            const id = connector.id;
            const response1 = await apiClient.post(`${API_AGENT_BUILDER}/converse`, {
              headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
              body: {
                input: 'Please say "hello"',
                connector_id: id,
              } satisfies ChatRequestBodyPayload,
              responseType: 'json',
            });
            expect(response1).toHaveStatusCode(200);
            expectNonEmptyReply(response1.body as ChatResponse);

            const response2 = await apiClient.post(`${API_AGENT_BUILDER}/converse`, {
              headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
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
          }
        );
      }
    }

    if (allEisModels.length === 0) {
      apiTest(
        'EIS models — skipped (no target/eis_models.json)',
        async ({ apiClient }, testInfo) => {
          const warmup = await apiClient.get('/api/actions/connectors', {
            headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
          });
          expect(warmup).toHaveStatusCode(200);
          testInfo.skip(true, eisModelsMissingReason);
        }
      );
    } else if (!eisCcmApiKey) {
      apiTest('EIS models — skipped (missing CCM API key)', async ({ apiClient }, testInfo) => {
        const warmup = await apiClient.get('/api/actions/connectors', {
          headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        });
        expect(warmup).toHaveStatusCode(200);
        testInfo.skip(true, eisCcmKeyMissingReason);
      });
    } else {
      apiTest('EIS — models discovery gate', async ({ apiClient }) => {
        const warmup = await apiClient.get('/api/actions/connectors', {
          headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
        });
        expect(warmup).toHaveStatusCode(200);
        expect(allEisModels.length).toBeGreaterThan(0);
      });

      for (const model of sampledEisModels) {
        const connectorId = `eis-${model.modelId}`;

        apiTest(`EIS ${model.modelId} — simple message`, async ({ apiClient }) => {
          const response = await apiClient.post(`${API_AGENT_BUILDER}/converse`, {
            headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
            body: {
              input: 'Hello',
              connector_id: connectorId,
            } satisfies ChatRequestBodyPayload,
            responseType: 'json',
          });
          expect(response).toHaveStatusCode(200);
          expectNonEmptyReply(response.body as ChatResponse);
        });

        apiTest(`EIS ${model.modelId} — tool call`, async ({ apiClient }) => {
          const response = await apiClient.post(`${API_AGENT_BUILDER}/converse`, {
            headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
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

        apiTest(`EIS ${model.modelId} — conversation continue`, async ({ apiClient }) => {
          const response1 = await apiClient.post(`${API_AGENT_BUILDER}/converse`, {
            headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
            body: {
              input: 'Please say "hello"',
              connector_id: connectorId,
            } satisfies ChatRequestBodyPayload,
            responseType: 'json',
          });
          expect(response1).toHaveStatusCode(200);
          expectNonEmptyReply(response1.body as ChatResponse);

          const response2 = await apiClient.post(`${API_AGENT_BUILDER}/converse`, {
            headers: { ...COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
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
