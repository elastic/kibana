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
  REGION_POLICY_API_PATH,
} from '../constants';

apiTest.describe('Region policy authorization', { tag: [...INFERENCE_LOCAL_TAGS] }, () => {
  apiTest.beforeAll(async ({ samlAuth, apiClient }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser(FEATURE_PRIVILEGED_ROLE);
    await apiClient.delete(REGION_POLICY_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
    });
  });

  apiTest.afterEach(async ({ samlAuth, apiClient }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser(FEATURE_PRIVILEGED_ROLE);
    await apiClient.delete(REGION_POLICY_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
    });
  });

  apiTest(
    'feature-privileged user gets 404 on GET when no policy exists',
    async ({ samlAuth, apiClient }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(FEATURE_PRIVILEGED_ROLE);
      const response = await apiClient.get(REGION_POLICY_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });

      expect(response).toHaveStatusCode(404);
      expect(response.body.message).toBeDefined();
    }
  );

  apiTest(
    'feature-privileged user gets 200 on GET when a policy exists',
    async ({ samlAuth, apiClient }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(FEATURE_PRIVILEGED_ROLE);
      await apiClient.put(REGION_POLICY_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: JSON.stringify({ allowed_geos: ['us'] }),
      });

      const response = await apiClient.get(REGION_POLICY_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.region_policy).toBeDefined();
    }
  );

  apiTest('feature-privileged user can PUT a region policy', async ({ samlAuth, apiClient }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser(FEATURE_PRIVILEGED_ROLE);
    const response = await apiClient.put(REGION_POLICY_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: JSON.stringify({ allowed_geos: ['us'] }),
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.region_policy).toBeDefined();
  });

  apiTest(
    'feature-privileged user can DELETE the region policy',
    async ({ samlAuth, apiClient }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(FEATURE_PRIVILEGED_ROLE);
      await apiClient.put(REGION_POLICY_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: JSON.stringify({ allowed_geos: ['eu'] }),
      });

      const response = await apiClient.delete(REGION_POLICY_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.acknowledged).toBe(true);
    }
  );

  apiTest(
    'feature-read user gets 403 on GET when no policy exists',
    async ({ samlAuth, apiClient }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(FEATURE_READ_ROLE);
      const response = await apiClient.get(REGION_POLICY_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });

      expect(response).toHaveStatusCode(403);
      expect(response.body.message).toBeDefined();
    }
  );

  apiTest(
    'feature-read user gets 403 on GET when a policy exists',
    async ({ samlAuth, apiClient }) => {
      const { cookieHeader: privilegedCookie } = await samlAuth.asInteractiveUser(
        FEATURE_PRIVILEGED_ROLE
      );
      await apiClient.put(REGION_POLICY_API_PATH, {
        headers: { ...COMMON_HEADERS, ...privilegedCookie },
        body: JSON.stringify({ allowed_geos: ['us'] }),
      });

      const { cookieHeader } = await samlAuth.asInteractiveUser(FEATURE_READ_ROLE);
      const response = await apiClient.get(REGION_POLICY_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });

      expect(response).toHaveStatusCode(403);
      expect(response.body.message).toBeDefined();
    }
  );

  apiTest('feature-read user gets 403 on PUT', async ({ samlAuth, apiClient }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser(FEATURE_READ_ROLE);
    const response = await apiClient.put(REGION_POLICY_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: JSON.stringify({ allowed_geos: ['us'] }),
    });

    expect(response).toHaveStatusCode(403);
    expect(response.body.message).toBeDefined();
  });

  apiTest('feature-read user gets 403 on DELETE', async ({ samlAuth, apiClient }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser(FEATURE_READ_ROLE);
    const response = await apiClient.delete(REGION_POLICY_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
    });

    expect(response).toHaveStatusCode(403);
    expect(response.body.message).toBeDefined();
  });

  apiTest('user with no inference privilege gets 403 on GET', async ({ samlAuth, apiClient }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser(NO_INFERENCE_PRIVILEGE_ROLE);
    const response = await apiClient.get(REGION_POLICY_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
    });

    expect(response).toHaveStatusCode(403);
    expect(response.body.message).toBeDefined();
  });

  apiTest('user with no inference privilege gets 403 on PUT', async ({ samlAuth, apiClient }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser(NO_INFERENCE_PRIVILEGE_ROLE);
    const response = await apiClient.put(REGION_POLICY_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: JSON.stringify({ allowed_geos: ['us'] }),
    });

    expect(response).toHaveStatusCode(403);
    expect(response.body.message).toBeDefined();
  });

  apiTest(
    'user with no inference privilege gets 403 on DELETE',
    async ({ samlAuth, apiClient }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(NO_INFERENCE_PRIVILEGE_ROLE);
      const response = await apiClient.delete(REGION_POLICY_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });

      expect(response).toHaveStatusCode(403);
      expect(response.body.message).toBeDefined();
    }
  );
});
