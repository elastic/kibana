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
  FEATURE_READ_ROLE,
  NO_INFERENCE_PRIVILEGE_ROLE,
  INFERENCE_FEATURES_API_PATH,
} from '../constants';

apiTest.describe('Inference features authorization', { tag: [...INFERENCE_LOCAL_TAGS] }, () => {
  apiTest('feature-privileged user can GET features', async ({ samlAuth, apiClient }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser(FEATURE_PRIVILEGED_ROLE);
    const response = await apiClient.get(INFERENCE_FEATURES_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.features).toBeDefined();
  });

  apiTest('read-privileged user can GET features', async ({ samlAuth, apiClient }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser(FEATURE_READ_ROLE);
    const response = await apiClient.get(INFERENCE_FEATURES_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.features).toBeDefined();
  });

  apiTest(
    'user with no inference privilege gets 403 on GET features',
    async ({ samlAuth, apiClient }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(NO_INFERENCE_PRIVILEGE_ROLE);
      const response = await apiClient.get(INFERENCE_FEATURES_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
