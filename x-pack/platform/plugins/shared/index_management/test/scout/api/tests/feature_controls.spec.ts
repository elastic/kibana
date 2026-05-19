/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

apiTest.describe('Index management feature controls', { tag: tags.stateful.classic }, () => {
  const kibanaAdminWithoutIndexManagement = {
    elasticsearch: { cluster: [] },
    kibana: [{ base: [], feature: { advancedSettings: ['all'] }, spaces: ['*'] }],
  };

  const dashboardReadWithIndexManagement = {
    elasticsearch: { cluster: ['monitor', 'manage_index_templates', 'manage_enrich'] },
    kibana: [
      { base: [], feature: { advancedSettings: ['read'], dashboard: ['read'] }, spaces: ['*'] },
    ],
  };

  apiTest(
    'kibana admin without index management privileges cannot access index_management management section',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(kibanaAdminWithoutIndexManagement);
      const response = await apiClient.post(testData.CAPABILITIES_API_PATH, {
        headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
        body: { applications: [] },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.index_management.monitor).toBe(false);
    }
  );

  apiTest(
    'user with dashboard read and index management privileges can access index_management management section',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(dashboardReadWithIndexManagement);
      const response = await apiClient.post(testData.CAPABILITIES_API_PATH, {
        headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
        body: { applications: [] },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.index_management.monitor).toBe(true);
    }
  );
});
