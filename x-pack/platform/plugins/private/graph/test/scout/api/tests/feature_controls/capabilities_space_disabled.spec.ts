/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { apiTest, testData } from '../../fixtures';

apiTest.describe(
  'POST /s/<space>/api/core/capabilities - space with graph disabled',
  { tag: testData.GRAPH_TAGS },
  () => {
    let credentials: RoleApiCredentials;
    let spaceId: string;

    apiTest.beforeAll(async ({ apiServices, requestAuth }, workerInfo) => {
      spaceId = `graph-disabled-${workerInfo.parallelIndex}-${Date.now()}`;
      await apiServices.spaces.create({
        id: spaceId,
        name: spaceId,
        disabledFeatures: ['graph'],
      });
      // Even an "all graph privileges" user must lose graph capabilities when
      // the feature is disabled at the space level.
      credentials = await requestAuth.getApiKeyForCustomRole(testData.GRAPH_ALL_ROLE);
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.spaces.delete(spaceId);
    });

    apiTest('hides graph navlink in the scoped capabilities', async ({ apiClient }) => {
      const response = await apiClient.post(`/s/${spaceId}/api/core/capabilities`, {
        headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
        body: { applications: ['graph'] },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);

      const body = response.body as testData.CapabilitiesResponse;
      expect(body.navLinks.graph).toBe(false);
      expect(body.catalogue.graph).toBe(false);
      expect(body.graph.show).toBe(false);
      expect(body.graph.save).toBe(false);
      expect(body.graph.delete).toBe(false);
    });
  }
);
