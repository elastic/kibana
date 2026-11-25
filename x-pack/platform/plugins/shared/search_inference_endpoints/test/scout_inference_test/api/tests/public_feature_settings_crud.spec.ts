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
  SAMPLE_FEATURES,
  publicFeatureSettingPath,
} from '../constants';

const savedFeature = {
  feature_id: 'retired_feature',
  endpoints: [
    {
      id: '.old-endpoint',
      parameters: { reasoning: { effort: 'low' } },
    },
  ],
};

apiTest.describe('Public feature settings CRUD', { tag: [...INFERENCE_LOCAL_TAGS] }, () => {
  let apiKeyHeader: Record<string, string>;
  let cookieHeader: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth, samlAuth }) => {
    ({ apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(FEATURE_PRIVILEGED_ROLE));
    ({ cookieHeader } = await samlAuth.asInteractiveUser(FEATURE_PRIVILEGED_ROLE));
  });

  apiTest.afterEach(async ({ apiClient }) => {
    await apiClient.put(PUBLIC_FEATURE_SETTINGS_API_PATH, {
      headers: { ...PUBLIC_FEATURE_SETTINGS_HEADERS, ...apiKeyHeader },
      body: JSON.stringify({ features: [] }),
    });
  });

  apiTest('GET returns an empty feature list when nothing is saved', async ({ apiClient }) => {
    const response = await apiClient.get(PUBLIC_FEATURE_SETTINGS_API_PATH, {
      headers: { ...PUBLIC_FEATURE_SETTINGS_HEADERS, ...apiKeyHeader },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({ features: [] });
  });

  apiTest(
    'returns a saved feature, including parameters, from GET and PUT',
    async ({ apiClient }) => {
      await apiClient.put(INFERENCE_SETTINGS_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: JSON.stringify({ features: [savedFeature, SAMPLE_FEATURES.attackDiscoveryClaude] }),
      });

      const readResponse = await apiClient.get(PUBLIC_FEATURE_SETTINGS_API_PATH, {
        headers: { ...PUBLIC_FEATURE_SETTINGS_HEADERS, ...apiKeyHeader },
      });

      expect(readResponse).toHaveStatusCode(200);
      expect(readResponse.body).toStrictEqual({
        features: [savedFeature, SAMPLE_FEATURES.attackDiscoveryClaude],
      });

      const writeResponse = await apiClient.put(PUBLIC_FEATURE_SETTINGS_API_PATH, {
        headers: { ...PUBLIC_FEATURE_SETTINGS_HEADERS, ...apiKeyHeader },
        body: JSON.stringify(readResponse.body),
      });

      expect(writeResponse).toHaveStatusCode(200);
      expect(writeResponse.body).toStrictEqual(readResponse.body);
    }
  );

  apiTest('updates one saved feature and leaves the others unchanged', async ({ apiClient }) => {
    await apiClient.put(INFERENCE_SETTINGS_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: JSON.stringify({ features: [savedFeature, SAMPLE_FEATURES.attackDiscoveryClaude] }),
    });

    const endpoints = [
      { id: '.replacement-endpoint', parameters: { reasoning: { effort: 'high' } } },
    ];
    const response = await apiClient.put(publicFeatureSettingPath(savedFeature.feature_id), {
      headers: { ...PUBLIC_FEATURE_SETTINGS_HEADERS, ...apiKeyHeader },
      body: JSON.stringify({ endpoints }),
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.features).toStrictEqual([
      { feature_id: savedFeature.feature_id, endpoints },
      SAMPLE_FEATURES.attackDiscoveryClaude,
    ]);
  });
});
