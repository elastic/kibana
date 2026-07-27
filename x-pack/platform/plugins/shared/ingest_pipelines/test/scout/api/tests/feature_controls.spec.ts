/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

apiTest.describe('Ingest pipelines feature controls', { tag: tags.stateful.classic }, () => {
  const adminWithoutIngest = {
    elasticsearch: { cluster: [] },
    kibana: [{ base: [], feature: { advancedSettings: ['all'] }, spaces: ['*'] }],
  };

  const dashboardReadWithIngest = {
    elasticsearch: { cluster: ['manage_pipeline', 'cluster:monitor/nodes/info'] },
    kibana: [
      { base: [], feature: { advancedSettings: ['read'], dashboard: ['read'] }, spaces: ['*'] },
    ],
  };

  apiTest(
    'kibana admin without ingest privileges cannot access ingest_pipelines management section',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(adminWithoutIngest);
      const response = await apiClient.post(testData.CAPABILITIES_API_PATH, {
        headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
        body: { applications: [] },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.management.ingest.ingest_pipelines).toBe(false);
    }
  );

  apiTest(
    'user with dashboard read and ingest pipelines privileges can access ingest_pipelines management section',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(dashboardReadWithIngest);
      const response = await apiClient.post(testData.CAPABILITIES_API_PATH, {
        headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
        body: { applications: [] },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.management.ingest.ingest_pipelines).toBe(true);
    }
  );
});
