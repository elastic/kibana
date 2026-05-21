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
  'POST /api/core/capabilities - user with graph:all',
  { tag: testData.GRAPH_TAGS },
  () => {
    let credentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      credentials = await requestAuth.getApiKeyForCustomRole(testData.GRAPH_ALL_ROLE);
    });

    apiTest(
      'exposes graph navlink and full read/save/delete capabilities',
      async ({ apiClient }) => {
        const response = await apiClient.post('/api/core/capabilities', {
          headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
          body: { applications: ['graph'] },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);

        const body = response.body as testData.CapabilitiesResponse;
        expect(body.navLinks.graph).toBe(true);
        expect(body.catalogue.graph).toBe(true);
        expect(body.graph.show).toBe(true);
        expect(body.graph.save).toBe(true);
        expect(body.graph.delete).toBe(true);
      }
    );
  }
);
