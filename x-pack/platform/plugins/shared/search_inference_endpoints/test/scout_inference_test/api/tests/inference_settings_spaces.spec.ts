/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { INFERENCE_LOCAL_TAGS } from '../../scout_test_tags';
import { apiTest } from '../fixtures';
import { COMMON_HEADERS, INFERENCE_SETTINGS_API_PATH, SAMPLE_FEATURES } from '../constants';

const SPACE_A = 'inference-settings-space-a';
const SPACE_B = 'inference-settings-space-b';

const spaceApiPath = (spaceId: string) => `s/${spaceId}/${INFERENCE_SETTINGS_API_PATH}`;

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
});
