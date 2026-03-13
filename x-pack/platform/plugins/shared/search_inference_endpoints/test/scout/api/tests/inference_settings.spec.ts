/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';
import { API_PATH, COMMON_HEADERS, ROLE_ALL } from '../fixtures/constants';

apiTest.describe(
  'inference_settings - authorized user',
  { tag: [...tags.deploymentAgnostic] },
  () => {
    let authHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      const credentials = await samlAuth.asInteractiveUser(ROLE_ALL);
      authHeaders = { ...credentials.cookieHeader, ...COMMON_HEADERS };
    });

    apiTest.afterEach(async ({ apiClient }) => {
      await apiClient.put(API_PATH, {
        headers: authHeaders,
        body: { features: [] },
      });
    });

    apiTest('GET should return empty defaults when no settings exist', async ({ apiClient }) => {
      const response = await apiClient.get(API_PATH, {
        headers: authHeaders,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toBeDefined();
      expect(response.body._meta).toBeDefined();
      expect(response.body._meta.id).toBe('default');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.features).toStrictEqual([]);
    });

    apiTest('PUT should create settings', async ({ apiClient }) => {
      const settings = {
        features: [
          {
            feature_id: 'agent_builder',
            endpoints: [{ id: '.anthropic-claude-3.7-sonnet' }],
          },
        ],
      };

      const response = await apiClient.put(API_PATH, {
        headers: authHeaders,
        body: settings,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body._meta.id).toBe('default');
      expect(response.body._meta.createdAt).toBeDefined();
      expect(response.body.data.features).toStrictEqual(settings.features);
    });

    apiTest('PUT should overwrite existing settings', async ({ apiClient }) => {
      const initialSettings = {
        features: [
          {
            feature_id: 'agent_builder',
            endpoints: [{ id: '.anthropic-claude-3.7-sonnet' }],
          },
        ],
      };

      await apiClient.put(API_PATH, {
        headers: authHeaders,
        body: initialSettings,
      });

      const updatedSettings = {
        features: [
          { feature_id: 'agent_builder', endpoints: [{ id: '.anthropic-claude-4.6-opus' }] },
          { feature_id: 'attack_discovery', endpoints: [{ id: '.eis-claude-3.7-sonnet' }] },
        ],
      };

      const response = await apiClient.put(API_PATH, {
        headers: authHeaders,
        body: updatedSettings,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.data.features).toStrictEqual(updatedSettings.features);
    });

    apiTest('PUT settings should persist across GET requests', async ({ apiClient }) => {
      const settings = {
        features: [
          {
            feature_id: 'agent_builder',
            endpoints: [{ id: '.anthropic-claude-3.7-sonnet' }],
          },
          {
            feature_id: 'attack_discovery',
            endpoints: [{ id: '.eis-claude-3.7-sonnet' }],
          },
        ],
      };

      await apiClient.put(API_PATH, {
        headers: authHeaders,
        body: settings,
      });

      const response = await apiClient.get(API_PATH, {
        headers: authHeaders,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.data.features).toStrictEqual(settings.features);
    });

    apiTest('should reject duplicate feature_id values', async ({ apiClient }) => {
      const response = await apiClient.put(API_PATH, {
        headers: authHeaders,
        body: {
          features: [
            { feature_id: 'agent_builder', endpoints: [{ id: '.endpoint-a' }] },
            { feature_id: 'agent_builder', endpoints: [{ id: '.endpoint-b' }] },
          ],
        },
      });

      expect(response).toHaveStatusCode(400);
    });

    apiTest('should reject duplicate endpoints within a feature', async ({ apiClient }) => {
      const response = await apiClient.put(API_PATH, {
        headers: authHeaders,
        body: {
          features: [
            {
              feature_id: 'agent_builder',
              endpoints: [{ id: '.endpoint-a' }, { id: '.endpoint-a' }],
            },
          ],
        },
      });

      expect(response).toHaveStatusCode(400);
    });

    apiTest('should reject empty feature_id', async ({ apiClient }) => {
      const response = await apiClient.put(API_PATH, {
        headers: authHeaders,
        body: {
          features: [{ feature_id: '', endpoints: [{ id: '.endpoint-a' }] }],
        },
      });

      expect(response).toHaveStatusCode(400);
    });

    apiTest('should reject empty endpoints array', async ({ apiClient }) => {
      const response = await apiClient.put(API_PATH, {
        headers: authHeaders,
        body: {
          features: [{ feature_id: 'agent_builder', endpoints: [] }],
        },
      });

      expect(response).toHaveStatusCode(400);
    });

    apiTest('should reject missing features field', async ({ apiClient }) => {
      const response = await apiClient.put(API_PATH, {
        headers: authHeaders,
        body: {},
      });

      expect(response).toHaveStatusCode(400);
    });
  }
);
