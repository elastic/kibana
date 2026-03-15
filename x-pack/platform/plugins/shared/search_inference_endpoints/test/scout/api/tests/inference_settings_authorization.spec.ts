/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';
import { API_PATH, COMMON_HEADERS, ROLE_FEATURE_ONLY } from '../fixtures/constants';

apiTest.describe(
  'inference_settings - authorization',
  { tag: [...tags.deploymentAgnostic] },
  () => {
    let featureHeaders: Record<string, string>;
    let viewerHeaders: Record<string, string>;
    let adminHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      const adminCredentials = await samlAuth.asInteractiveUser('admin');
      adminHeaders = { ...adminCredentials.cookieHeader, ...COMMON_HEADERS };

      const featureCredentials = await samlAuth.asInteractiveUser(ROLE_FEATURE_ONLY);
      featureHeaders = { ...featureCredentials.cookieHeader, ...COMMON_HEADERS };

      const viewerCredentials = await samlAuth.asInteractiveUser('viewer');
      viewerHeaders = { ...viewerCredentials.cookieHeader, ...COMMON_HEADERS };
    });

    apiTest.afterEach(async ({ apiClient }) => {
      await apiClient.put(API_PATH, {
        headers: adminHeaders,
        body: { features: [] },
      });
    });

    apiTest('feature-privileged user GET should return 200', async ({ apiClient }) => {
      const response = await apiClient.get(API_PATH, {
        headers: featureHeaders,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.data).toBeDefined();
    });

    apiTest('feature-privileged user PUT should return 200', async ({ apiClient }) => {
      const settings = {
        features: [
          {
            feature_id: 'agent_builder',
            endpoints: [{ id: '.anthropic-claude-3.7-sonnet' }],
          },
        ],
      };

      const response = await apiClient.put(API_PATH, {
        headers: featureHeaders,
        body: settings,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.data.features).toStrictEqual(settings.features);
    });

    apiTest('unauthorized user GET should return 403', async ({ apiClient }) => {
      const response = await apiClient.get(API_PATH, {
        headers: viewerHeaders,
      });

      expect(response).toHaveStatusCode(403);
    });

    apiTest('unauthorized user PUT should return 403', async ({ apiClient }) => {
      const response = await apiClient.put(API_PATH, {
        headers: viewerHeaders,
        body: {
          features: [
            {
              feature_id: 'agent_builder',
              endpoints: [{ id: '.anthropic-claude-3.7-sonnet' }],
            },
          ],
        },
      });

      expect(response).toHaveStatusCode(403);
    });
  }
);
