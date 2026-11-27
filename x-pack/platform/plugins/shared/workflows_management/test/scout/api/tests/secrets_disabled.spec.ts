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
      const headers = {
        'kbn-xsrf': 'scout',
        'x-elastic-internal-origin': 'kibana',
        'elastic-api-version': '1',
        ...cookieHeader,
      };
      const path = 'internal/workflows/secrets';
      const name = 'disabled_secret';
      const value = 'correct-horse-battery-staple';

      const responses = [
        await apiClient.get(path, { headers, responseType: 'json' }),
        await apiClient.post(path, { headers, body: { name, value }, responseType: 'json' }),
        await apiClient.patch(`${path}/${name}`, {
          headers,
          body: { value },
          responseType: 'json',
        }),
        await apiClient.delete(`${path}/${name}`, { headers, responseType: 'json' }),
      ];

      for (const response of responses) {
        expect(response).toHaveStatusCode(404);
        // The router's answer to an unknown route. The secrets routes answer 404 only for a
        // missing secret, with a message that names it.
        expect(response.body.message).toBe('Not Found');
      }
    });

    apiTest('has no privilege that grants managing secrets', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

      const response = await apiClient.get('api/security/privileges?includeActions=true', {
        headers: { 'x-elastic-internal-origin': 'kibana', ...cookieHeader },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      const { workflowsManagement } = response.body.features;

      expect(Object.keys(workflowsManagement)).not.toContain('workflow_secret_manage');
      expect(Object.values(workflowsManagement).flat()).not.toContain(MANAGE_SECRETS_ACTION);
    });
  }
);
