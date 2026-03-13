/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';
import { API_PATH, COMMON_HEADERS } from '../fixtures/constants';

apiTest.describe(
  'inference_settings - space isolation',
  { tag: [...tags.stateful.classic] },
  () => {
    const SPACE_A = 'inference-test-space-a';
    const SPACE_B = 'inference-test-space-b';

    let authHeaders: Record<string, string>;

    const spaceApiPath = (spaceId: string) => `/s/${spaceId}${API_PATH}`;

    apiTest.beforeAll(async ({ samlAuth, apiServices }) => {
      const credentials = await samlAuth.asInteractiveUser('admin');
      authHeaders = { ...credentials.cookieHeader, ...COMMON_HEADERS };

      await apiServices.spaces.create({ id: SPACE_A, name: 'Space A', disabledFeatures: [] });
      await apiServices.spaces.create({ id: SPACE_B, name: 'Space B', disabledFeatures: [] });
    });

    apiTest.afterEach(async ({ apiClient }) => {
      await apiClient.put(spaceApiPath(SPACE_A), {
        headers: authHeaders,
        body: { features: [] },
      });
      await apiClient.put(spaceApiPath(SPACE_B), {
        headers: authHeaders,
        body: { features: [] },
      });
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.spaces.delete(SPACE_A);
      await apiServices.spaces.delete(SPACE_B);
    });

    apiTest(
      'settings saved in one space should not be visible in another',
      async ({ apiClient }) => {
        const settingsA = {
          features: [
            {
              feature_id: 'agent_builder',
              endpoints: [{ id: '.anthropic-claude-3.7-sonnet' }],
            },
          ],
        };

        await apiClient.put(spaceApiPath(SPACE_A), {
          headers: authHeaders,
          body: settingsA,
        });

        const response = await apiClient.get(spaceApiPath(SPACE_B), {
          headers: authHeaders,
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.data.features).toStrictEqual([]);
      }
    );

    apiTest(
      'settings saved in one space should be readable from the same space',
      async ({ apiClient }) => {
        const settingsA = {
          features: [
            {
              feature_id: 'agent_builder',
              endpoints: [{ id: '.anthropic-claude-3.7-sonnet' }],
            },
          ],
        };

        await apiClient.put(spaceApiPath(SPACE_A), {
          headers: authHeaders,
          body: settingsA,
        });

        const response = await apiClient.get(spaceApiPath(SPACE_A), {
          headers: authHeaders,
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.data.features).toStrictEqual(settingsA.features);
      }
    );

    apiTest('each space should maintain its own independent settings', async ({ apiClient }) => {
      const settingsA = {
        features: [
          {
            feature_id: 'agent_builder',
            endpoints: [{ id: '.anthropic-claude-3.7-sonnet' }],
          },
        ],
      };

      const settingsB = {
        features: [
          {
            feature_id: 'attack_discovery',
            endpoints: [{ id: '.eis-claude-3.7-sonnet' }],
          },
        ],
      };

      await apiClient.put(spaceApiPath(SPACE_A), {
        headers: authHeaders,
        body: settingsA,
      });

      await apiClient.put(spaceApiPath(SPACE_B), {
        headers: authHeaders,
        body: settingsB,
      });

      const responseA = await apiClient.get(spaceApiPath(SPACE_A), {
        headers: authHeaders,
      });

      const responseB = await apiClient.get(spaceApiPath(SPACE_B), {
        headers: authHeaders,
      });

      expect(responseA).toHaveStatusCode(200);
      expect(responseA.body.data.features).toStrictEqual(settingsA.features);
      expect(responseB).toHaveStatusCode(200);
      expect(responseB.body.data.features).toStrictEqual(settingsB.features);
    });
  }
);
