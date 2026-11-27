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
  FEATURE_PRIVILEGED_ROLE,
  INFERENCE_SETTINGS_API_PATH,
  PUBLIC_FEATURE_SETTINGS_API_PATH,
  PUBLIC_FEATURE_SETTINGS_HEADERS,
} from '../constants';

const SPACE_A = 'public-feature-settings-space-a';
const SPACE_B = 'public-feature-settings-space-b';

const spacePath = (spaceId: string, path: string) => `s/${spaceId}/${path}`;

const savedFeature = {
  feature_id: 'retired_feature',
  endpoints: [{ id: '.old-endpoint' }],
};

apiTest.describe('Public feature settings spaces', { tag: [...INFERENCE_LOCAL_TAGS] }, () => {
  let apiKeyHeader: Record<string, string>;
  let cookieHeader: Record<string, string>;

  apiTest.beforeAll(async ({ apiServices, requestAuth, samlAuth }) => {
    ({ apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(FEATURE_PRIVILEGED_ROLE));
    ({ cookieHeader } = await samlAuth.asInteractiveUser(FEATURE_PRIVILEGED_ROLE));
    await apiServices.spaces.create({ id: SPACE_A, name: 'Space A', disabledFeatures: [] });
    await apiServices.spaces.create({ id: SPACE_B, name: 'Space B', disabledFeatures: [] });
  });

  apiTest.afterEach(async ({ apiClient }) => {
    for (const spaceId of [SPACE_A, SPACE_B]) {
      await apiClient.put(spacePath(spaceId, INFERENCE_SETTINGS_API_PATH), {
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
    await apiClient.put(spacePath(SPACE_A, INFERENCE_SETTINGS_API_PATH), {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: JSON.stringify({ features: [savedFeature] }),
    });

    const response = await apiClient.get(spacePath(SPACE_B, PUBLIC_FEATURE_SETTINGS_API_PATH), {
      headers: { ...PUBLIC_FEATURE_SETTINGS_HEADERS, ...apiKeyHeader },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({ features: [] });
  });

  apiTest(
    'settings written in one space are readable from the same space',
    async ({ apiClient }) => {
      await apiClient.put(spacePath(SPACE_A, INFERENCE_SETTINGS_API_PATH), {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: JSON.stringify({ features: [savedFeature] }),
      });

      const response = await apiClient.get(spacePath(SPACE_A, PUBLIC_FEATURE_SETTINGS_API_PATH), {
        headers: { ...PUBLIC_FEATURE_SETTINGS_HEADERS, ...apiKeyHeader },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ features: [savedFeature] });
    }
  );
});
