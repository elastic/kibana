/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// ML capabilities contract: navlink + ml.canGet/Create per role and per space.

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { mlApiTest as apiTest, COMMON_HEADERS } from '../fixtures';

interface CapabilitiesResponse {
  navLinks: Record<string, boolean>;
  catalogue: Record<string, boolean>;
  ml: { canGetJobs: boolean; canCreateJob: boolean };
}

const CAPABILITIES_API_PATH = 'api/core/capabilities';
const ENABLED_SPACE_ID = 'ml_fc_api_enabled_space';
const DISABLED_SPACE_ID = 'ml_fc_api_disabled_space';

apiTest.describe('Machine Learning feature controls', { tag: tags.stateful.classic }, () => {
  apiTest.beforeAll(async ({ apiServices }) => {
    await apiServices.spaces.create({ id: ENABLED_SPACE_ID, disabledFeatures: [] });
    await apiServices.spaces.create({ id: DISABLED_SPACE_ID, disabledFeatures: ['ml'] });
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.spaces.delete(ENABLED_SPACE_ID);
    await apiServices.spaces.delete(DISABLED_SPACE_ID);
  });

  apiTest(
    'global:all sees Machine Learning navlink and ml management entry',
    async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForMlGlobalAll();
      const response = await apiClient.post(CAPABILITIES_API_PATH, {
        headers: { ...COMMON_HEADERS, ...apiKeyHeader },
        responseType: 'json',
        body: { applications: ['ml'] },
      });

      expect(response).toHaveStatusCode(200);
      const caps = response.body as CapabilitiesResponse;
      expect(caps.navLinks.ml).toBe(true);
      expect(caps.ml.canGetJobs).toBe(true);
    }
  );

  apiTest(
    'ml:read sees Machine Learning navlink with read-only ML capabilities',
    async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForMlRead();
      const response = await apiClient.post(CAPABILITIES_API_PATH, {
        headers: { ...COMMON_HEADERS, ...apiKeyHeader },
        responseType: 'json',
        body: { applications: ['ml'] },
      });

      expect(response).toHaveStatusCode(200);
      const caps = response.body as CapabilitiesResponse;
      expect(caps.navLinks.ml).toBe(true);
      expect(caps.ml.canGetJobs).toBe(true);
      expect(caps.ml.canCreateJob).toBe(false);
    }
  );

  apiTest(
    'discover:read alone does NOT see Machine Learning navlink',
    async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForMlNone();
      const response = await apiClient.post(CAPABILITIES_API_PATH, {
        headers: { ...COMMON_HEADERS, ...apiKeyHeader },
        responseType: 'json',
        body: { applications: ['ml'] },
      });

      expect(response).toHaveStatusCode(200);
      const caps = response.body as CapabilitiesResponse;
      expect(caps.navLinks.ml ?? false).toBe(false);
    }
  );

  apiTest(
    'global:all sees Machine Learning navlink in a space where ML is enabled',
    async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForMlGlobalAll();
      const response = await apiClient.post(`s/${ENABLED_SPACE_ID}/${CAPABILITIES_API_PATH}`, {
        headers: { ...COMMON_HEADERS, ...apiKeyHeader },
        responseType: 'json',
        body: { applications: ['ml'] },
      });

      expect(response).toHaveStatusCode(200);
      const caps = response.body as CapabilitiesResponse;
      expect(caps.navLinks.ml).toBe(true);
    }
  );

  apiTest(
    'global:all does NOT see Machine Learning navlink in a space where ML is disabled',
    async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForMlGlobalAll();
      const response = await apiClient.post(`s/${DISABLED_SPACE_ID}/${CAPABILITIES_API_PATH}`, {
        headers: { ...COMMON_HEADERS, ...apiKeyHeader },
        responseType: 'json',
        body: { applications: ['ml'] },
      });

      expect(response).toHaveStatusCode(200);
      const caps = response.body as CapabilitiesResponse;
      expect(caps.navLinks.ml ?? false).toBe(false);
    }
  );
});
