/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { expect } from '@kbn/scout/api';
import { INFERENCE_LOCAL_TAGS } from '../../scout_test_tags';
import { apiTest } from '../fixtures';
import {
  COMMON_HEADERS,
  INFERENCE_CONNECTORS_API_PATH,
  INFERENCE_SETTINGS_API_PATH,
} from '../constants';

const SPACE_A = 'inference-settings-space-a';
const SPACE_B = 'inference-settings-space-b';

/**
 * Two native ES inference endpoints created directly via the ES `_inference` API
 * in beforeAll and deleted in afterAll. They appear in getConnectorList via the
 * getInferenceEndpoints path, so no preconfigured connector config is needed.
 * Credentials are intentionally fake — the endpoints are listed but never invoked.
 */
const EP_ID_1 = 'inference-space-test-ep-1';
const EP_ID_2 = 'inference-space-test-ep-2';

const OPENAI_ENDPOINT_CONFIG = {
  task_type: 'chat_completion',
  inference_config: {
    service: 'openai',
    service_settings: {
      api_key: 'test-key-space-isolation',
      model_id: 'gpt-4o',
    },
  },
};

async function ensureInferenceEndpoint(esClient: Client, inferenceId: string) {
  try {
    await (esClient.inference as any).put({ inference_id: inferenceId, ...OPENAI_ENDPOINT_CONFIG });
  } catch (e: any) {
    if (!e?.message?.includes('resource_already_exists_exception')) {
      throw e;
    }
  }
}

async function deleteInferenceEndpoint(esClient: Client, inferenceId: string) {
  try {
    await (esClient.inference as any).delete({ inference_id: inferenceId, force: true });
  } catch {
    // already gone — nothing to do
  }
}

const spaceApiPath = (spaceId: string) => `s/${spaceId}/${INFERENCE_SETTINGS_API_PATH}`;
const spaceConnectorsUrl = (spaceId: string, featureId: string) =>
  `s/${spaceId}/${INFERENCE_CONNECTORS_API_PATH}?featureId=${encodeURIComponent(featureId)}`;

apiTest.describe(
  'Inference settings space isolation — connectors API',
  { tag: [...INFERENCE_LOCAL_TAGS] },
  () => {
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ apiServices, samlAuth, esClient }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
      await apiServices.spaces.create({ id: SPACE_A, name: 'Space A', disabledFeatures: [] });
      await apiServices.spaces.create({ id: SPACE_B, name: 'Space B', disabledFeatures: [] });

      for (const inferenceId of [EP_ID_1, EP_ID_2]) {
        await ensureInferenceEndpoint(esClient, inferenceId);
      }
    });

    apiTest.afterEach(async ({ apiClient }) => {
      for (const spaceId of [SPACE_A, SPACE_B]) {
        await apiClient.put(spaceApiPath(spaceId), {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: JSON.stringify({ features: [] }),
        });
      }
    });

    apiTest.afterAll(async ({ apiServices, esClient }) => {
      await apiServices.spaces.delete(SPACE_A);
      await apiServices.spaces.delete(SPACE_B);

      for (const inferenceId of [EP_ID_1, EP_ID_2]) {
        await deleteInferenceEndpoint(esClient, inferenceId);
      }
    });

    apiTest(
      'connectors API uses per-space inference settings for the same feature',
      async ({ apiClient }) => {
        // Configure Space A → EP_ID_1, Space B → EP_ID_2
        await apiClient.put(spaceApiPath(SPACE_A), {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: JSON.stringify({
            features: [{ feature_id: 'agent_builder', endpoints: [{ id: EP_ID_1 }] }],
          }),
        });
        await apiClient.put(spaceApiPath(SPACE_B), {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: JSON.stringify({
            features: [{ feature_id: 'agent_builder', endpoints: [{ id: EP_ID_2 }] }],
          }),
        });

        const resA = await apiClient.get(spaceConnectorsUrl(SPACE_A, 'agent_builder'), {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
        });
        const resB = await apiClient.get(spaceConnectorsUrl(SPACE_B, 'agent_builder'), {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
        });

        expect(resA).toHaveStatusCode(200);
        expect(resB).toHaveStatusCode(200);
        expect(resA.body.soEntryFound).toBe(true);
        expect(resB.body.soEntryFound).toBe(true);

        const idsA = (resA.body.connectors ?? []).map(
          (c: { connectorId: string }) => c.connectorId
        );
        const idsB = (resB.body.connectors ?? []).map(
          (c: { connectorId: string }) => c.connectorId
        );
        expect(idsA.length).toBeGreaterThan(0);
        expect(idsB.length).toBeGreaterThan(0);
        expect(idsA[0]).toStrictEqual(EP_ID_1);
        expect(idsB[0]).toStrictEqual(EP_ID_2);
        expect(idsA[0]).not.toStrictEqual(idsB[0]);
      }
    );
  }
);
