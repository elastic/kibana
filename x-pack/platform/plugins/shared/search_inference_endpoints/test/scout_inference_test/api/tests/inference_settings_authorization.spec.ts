/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';
import {
  API_PATH,
  COMMON_HEADERS,
  FEATURE_PRIVILEGED_ROLE,
  LOCAL_TAGS,
  SAMPLE_FEATURES,
} from '../constants';

apiTest.describe('Inference settings authorization', { tag: LOCAL_TAGS }, () => {
  let featureUserCookie: Record<string, string>;
  let viewerCookie: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    ({ cookieHeader: featureUserCookie } = await samlAuth.asInteractiveUser(
      FEATURE_PRIVILEGED_ROLE
    ));
    ({ cookieHeader: viewerCookie } = await samlAuth.asInteractiveUser('viewer'));
  });

  apiTest.afterEach(async ({ apiClient }) => {
    await apiClient.put(API_PATH, {
      headers: { ...COMMON_HEADERS, ...featureUserCookie },
      body: JSON.stringify({ features: [] }),
    });
  });

  apiTest('feature-privileged user can GET settings', async ({ apiClient }) => {
    const response = await apiClient.get(API_PATH, {
      headers: { ...COMMON_HEADERS, ...featureUserCookie },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.data).toBeDefined();
  });

  apiTest('feature-privileged user can PUT settings', async ({ apiClient }) => {
    const settings = { features: [SAMPLE_FEATURES.agentBuilderAnthropic] };

    const response = await apiClient.put(API_PATH, {
      headers: { ...COMMON_HEADERS, ...featureUserCookie },
      body: JSON.stringify(settings),
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.data.features).toStrictEqual(settings.features);
  });

  apiTest(
    'user without searchInferenceEndpoints privilege gets 403 on GET',
    async ({ apiClient }) => {
      const response = await apiClient.get(API_PATH, {
        headers: { ...COMMON_HEADERS, ...viewerCookie },
      });

      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest(
    'user without searchInferenceEndpoints privilege gets 403 on PUT',
    async ({ apiClient }) => {
      const response = await apiClient.put(API_PATH, {
        headers: { ...COMMON_HEADERS, ...viewerCookie },
        body: JSON.stringify({ features: [SAMPLE_FEATURES.agentBuilderAnthropic] }),
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
