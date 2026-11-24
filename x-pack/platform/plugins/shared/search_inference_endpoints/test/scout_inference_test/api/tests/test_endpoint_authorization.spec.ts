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
  FEATURE_READ_WITH_ES_INFERENCE_ROLE,
  NO_INFERENCE_PRIVILEGE_ROLE,
  getTestEndpointApiPath,
} from '../constants';

const MISSING_ENDPOINT_ID = 'scout-test-endpoint-does-not-exist';

apiTest.describe('Test endpoint authorization', { tag: [...INFERENCE_LOCAL_TAGS] }, () => {
  apiTest(
    'feature-privileged user reaches the route and gets 404 for a missing endpoint',
    async ({ samlAuth, apiClient }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(FEATURE_PRIVILEGED_ROLE);
      const response = await apiClient.post(getTestEndpointApiPath(MISSING_ENDPOINT_ID), {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });

      expect(response).toHaveStatusCode(404);
      expect(response.body.message).toBe(`Inference endpoint not found [${MISSING_ENDPOINT_ID}]`);
    }
  );

  apiTest(
    'feature-read user with Elasticsearch inference access gets 403',
    async ({ samlAuth, apiClient }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(
        FEATURE_READ_WITH_ES_INFERENCE_ROLE
      );
      const response = await apiClient.post(getTestEndpointApiPath(MISSING_ENDPOINT_ID), {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });

      expect(response).toHaveStatusCode(403);
      expect(response.body.message).toBeDefined();
    }
  );

  apiTest('user with no inference privilege gets 403', async ({ samlAuth, apiClient }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser(NO_INFERENCE_PRIVILEGE_ROLE);
    const response = await apiClient.post(getTestEndpointApiPath(MISSING_ENDPOINT_ID), {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
    });

    expect(response).toHaveStatusCode(403);
    expect(response.body.message).toBeDefined();
  });
});
