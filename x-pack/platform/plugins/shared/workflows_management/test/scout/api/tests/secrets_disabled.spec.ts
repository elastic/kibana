/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

const MANAGE_SECRETS_ACTION = 'api:workflowsManagement:secrets:manage';

apiTest.describe(
  'Workflow secrets while secrets are disabled',
  { tag: [...tags.stateful.classic] },
  () => {
    apiTest('has no secrets routes', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

      const response = await apiClient.get('internal/workflows/secrets', {
        headers: {
          'x-elastic-internal-origin': 'kibana',
          'elastic-api-version': '1',
          ...cookieHeader,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(404);
    });

    apiTest('has no privilege that grants managing secrets', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

      const response = await apiClient.get('api/security/privileges?includeActions=true', {
        headers: { 'x-elastic-internal-origin': 'kibana', ...cookieHeader },
        responseType: 'json',
      });
      const { workflowsManagement } = response.body.features;

      expect(response).toHaveStatusCode(200);
      expect(Object.keys(workflowsManagement)).not.toContain('workflow_secret_manage');
      expect(Object.values(workflowsManagement).flat()).not.toContain(MANAGE_SECRETS_ACTION);
    });
  }
);
