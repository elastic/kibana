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
  SAMPLE_FEATURES,
} from '../constants';

apiTest.describe('Inference settings CRUD', { tag: [...INFERENCE_LOCAL_TAGS] }, () => {
  let cookieHeader: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    ({ cookieHeader } = await samlAuth.asInteractiveUser(FEATURE_PRIVILEGED_ROLE));
  });

  apiTest.afterEach(async ({ apiClient }) => {
    await apiClient.put(INFERENCE_SETTINGS_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: JSON.stringify({ features: [] }),
    });
  });

  apiTest('GET returns empty defaults when no settings exist', async ({ apiClient }) => {
    const response = await apiClient.get(INFERENCE_SETTINGS_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body._meta).toMatchObject({ id: 'default' });
    expect(response.body.data.features).toStrictEqual([]);
  });

  apiTest('PUT creates settings and returns the saved payload', async ({ apiClient }) => {
    const settings = { features: [SAMPLE_FEATURES.agentBuilderAnthropic] };

    const response = await apiClient.put(INFERENCE_SETTINGS_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: JSON.stringify(settings),
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body._meta).toMatchObject({ id: 'default' });
    expect(response.body._meta.createdAt).toBeDefined();
    expect(response.body.data.features).toStrictEqual(settings.features);
  });

  apiTest('PUT overwrites existing settings', async ({ apiClient }) => {
    await apiClient.put(INFERENCE_SETTINGS_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: JSON.stringify({ features: [SAMPLE_FEATURES.agentBuilderAnthropic] }),
    });

    const updated = {
      features: [SAMPLE_FEATURES.agentBuilderClaudeOpus, SAMPLE_FEATURES.attackDiscoveryClaude],
    };

    const response = await apiClient.put(INFERENCE_SETTINGS_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: JSON.stringify(updated),
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.data.features).toStrictEqual(updated.features);
  });

  apiTest('settings persist across GET requests', async ({ apiClient }) => {
    const settings = {
      features: [SAMPLE_FEATURES.agentBuilderAnthropic, SAMPLE_FEATURES.attackDiscoveryClaude],
    };

    await apiClient.put(INFERENCE_SETTINGS_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: JSON.stringify(settings),
    });

    const response = await apiClient.get(INFERENCE_SETTINGS_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.data.features).toStrictEqual(settings.features);
  });
});
