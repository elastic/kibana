/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { INFERENCE_LOCAL_TAGS } from '../../scout_test_tags';
import { apiTest } from '../fixtures';
import {
  COMMON_HEADERS,
  INFERENCE_CONNECTORS_API_PATH,
  INFERENCE_SETTINGS_API_PATH,
  SAMPLE_FEATURES,
} from '../constants';

const SPACE_A = 'inference-settings-space-a';
const SPACE_B = 'inference-settings-space-b';

const spaceApiPath = (spaceId: string) => `s/${spaceId}/${INFERENCE_SETTINGS_API_PATH}`;
const spaceConnectorsUrl = (spaceId: string, featureId: string) =>
  `s/${spaceId}/${INFERENCE_CONNECTORS_API_PATH}?featureId=${encodeURIComponent(featureId)}`;

apiTest.describe('Inference settings space isolation', { tag: [...INFERENCE_LOCAL_TAGS] }, () => {
  let cookieHeader: Record<string, string>;

  apiTest.beforeAll(async ({ apiServices, samlAuth }) => {
    ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
    await apiServices.spaces.create({ id: SPACE_A, name: 'Space A', disabledFeatures: [] });
    await apiServices.spaces.create({ id: SPACE_B, name: 'Space B', disabledFeatures: [] });
  });

  apiTest.afterEach(async ({ apiClient }) => {
    for (const spaceId of [SPACE_A, SPACE_B]) {
      await apiClient.put(spaceApiPath(spaceId), {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: JSON.stringify({ features: [] }),
      });
    }
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.spaces.delete(SPACE_A);
    await apiServices.spaces.delete(SPACE_B);
  });

  apiTest('settings written in one space are not visible in another', async ({ apiClient }) => {
    const settings = { features: [SAMPLE_FEATURES.agentBuilderAnthropic] };

    await apiClient.put(spaceApiPath(SPACE_A), {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: JSON.stringify(settings),
    });

    const response = await apiClient.get(spaceApiPath(SPACE_B), {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.data.features).toStrictEqual([]);
  });

  apiTest(
    'settings written in one space are readable from the same space',
    async ({ apiClient }) => {
      const settings = { features: [SAMPLE_FEATURES.agentBuilderAnthropic] };

      await apiClient.put(spaceApiPath(SPACE_A), {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: JSON.stringify(settings),
      });

      const response = await apiClient.get(spaceApiPath(SPACE_A), {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.data.features).toStrictEqual(settings.features);
    }
  );

  apiTest('each space maintains its own independent settings', async ({ apiClient }) => {
    const settingsA = { features: [SAMPLE_FEATURES.agentBuilderAnthropic] };
    const settingsB = { features: [SAMPLE_FEATURES.attackDiscoveryClaude] };

    await apiClient.put(spaceApiPath(SPACE_A), {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: JSON.stringify(settingsA),
    });

    await apiClient.put(spaceApiPath(SPACE_B), {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: JSON.stringify(settingsB),
    });

    const responseA = await apiClient.get(spaceApiPath(SPACE_A), {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
    });
    const responseB = await apiClient.get(spaceApiPath(SPACE_B), {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
    });

    expect(responseA.body.data.features).toStrictEqual(settingsA.features);
    expect(responseB.body.data.features).toStrictEqual(settingsB.features);
  });

  apiTest(
    'connectors API uses per-space inference settings for the same feature',
    async ({ apiClient }) => {
      // Endpoint IDs differ by deployment (stateful vs serverless). Discover two real IDs from
      // the live catalog before asserting per-space saved-object overrides.
      const baseline = await apiClient.get(spaceConnectorsUrl(SPACE_A, 'agent_builder'), {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });
      expect(baseline).toHaveStatusCode(200);
      const catalogIds = (baseline.body.connectors ?? []).map(
        (c: { connectorId: string }) => c.connectorId
      );
      expect(catalogIds.length).toBeGreaterThanOrEqual(2);
      const idForA = catalogIds[0];
      const distinctFromFirst = catalogIds.filter((id: string) => id !== idForA);
      expect(distinctFromFirst.length).toBeGreaterThan(0);
      const idForB = distinctFromFirst[0];

      await apiClient.put(spaceApiPath(SPACE_A), {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: JSON.stringify({
          features: [{ feature_id: 'agent_builder', endpoints: [{ id: idForA }] }],
        }),
      });
      await apiClient.put(spaceApiPath(SPACE_B), {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: JSON.stringify({
          features: [{ feature_id: 'agent_builder', endpoints: [{ id: idForB }] }],
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

      const idsA = (resA.body.connectors ?? []).map((c: { connectorId: string }) => c.connectorId);
      const idsB = (resB.body.connectors ?? []).map((c: { connectorId: string }) => c.connectorId);
      expect(idsA.length).toBeGreaterThan(0);
      expect(idsB.length).toBeGreaterThan(0);
      expect(idsA[0]).toStrictEqual(idForA);
      expect(idsB[0]).toStrictEqual(idForB);
      expect(idsA[0]).not.toStrictEqual(idsB[0]);
    }
  );
});
