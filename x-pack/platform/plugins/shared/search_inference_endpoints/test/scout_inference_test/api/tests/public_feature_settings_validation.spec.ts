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
  publicFeatureSettingPath,
} from '../constants';

const savedFeature = {
  feature_id: 'retired_feature',
  endpoints: [{ id: '.endpoint-a' }],
};

apiTest.describe('Public feature settings validation', { tag: [...INFERENCE_LOCAL_TAGS] }, () => {
  let apiKeyHeader: Record<string, string>;
  let cookieHeader: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth, samlAuth }) => {
    ({ apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(FEATURE_PRIVILEGED_ROLE));
    ({ cookieHeader } = await samlAuth.asInteractiveUser(FEATURE_PRIVILEGED_ROLE));
  });

  apiTest.afterEach(async ({ apiClient }) => {
    await apiClient.put(INFERENCE_SETTINGS_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: JSON.stringify({ features: [] }),
    });
  });

  apiTest('rejects an unknown feature id', async ({ apiClient }) => {
    const response = await apiClient.put(PUBLIC_FEATURE_SETTINGS_API_PATH, {
      headers: { ...PUBLIC_FEATURE_SETTINGS_HEADERS, ...apiKeyHeader },
      body: JSON.stringify({
        features: [{ feature_id: 'not_a_feature', endpoints: [{ id: '.endpoint-a' }] }],
      }),
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body).toMatchObject({ message: 'Invalid inference settings' });
    expect(response.body.attributes.errors[0]).toContain('not_a_feature');
  });

  apiTest('rejects an unknown feature id on the single feature route', async ({ apiClient }) => {
    const response = await apiClient.put(publicFeatureSettingPath('not_a_feature'), {
      headers: { ...PUBLIC_FEATURE_SETTINGS_HEADERS, ...apiKeyHeader },
      body: JSON.stringify({ endpoints: [{ id: '.endpoint-a' }] }),
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.attributes.errors[0]).toContain('not_a_feature');
  });

  apiTest('rejects a document that lists the same saved feature twice', async ({ apiClient }) => {
    await apiClient.put(INFERENCE_SETTINGS_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: JSON.stringify({ features: [savedFeature] }),
    });

    const response = await apiClient.put(PUBLIC_FEATURE_SETTINGS_API_PATH, {
      headers: { ...PUBLIC_FEATURE_SETTINGS_HEADERS, ...apiKeyHeader },
      body: JSON.stringify({ features: [savedFeature, savedFeature] }),
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.attributes.errors[0]).toContain(savedFeature.feature_id);
  });

  apiTest(
    'rejects a reasoning effort that is not one of the allowed values',
    async ({ apiClient }) => {
      const response = await apiClient.put(PUBLIC_FEATURE_SETTINGS_API_PATH, {
        headers: { ...PUBLIC_FEATURE_SETTINGS_HEADERS, ...apiKeyHeader },
        body: JSON.stringify({
          features: [
            {
              feature_id: 'agent_builder',
              endpoints: [{ id: '.endpoint-a', parameters: { reasoning: { effort: 'turbo' } } }],
            },
          ],
        }),
      });

      expect(response).toHaveStatusCode(400);
    }
  );
});
