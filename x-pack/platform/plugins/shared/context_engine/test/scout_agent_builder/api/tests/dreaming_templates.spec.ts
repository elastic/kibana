/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import type { KibanaRole } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

const { CONTEXT_ENGINE_READ, INTERNAL_API_HEADERS } = testData;
const DREAMING_TEMPLATES_PATH = 'internal/context_engine/dreaming_templates';
const GLOBAL_SETTINGS_PATH = '/internal/kibana/global_settings';

interface GlobalUiSettingsResponse {
  settings?: Record<string, { userValue?: boolean }>;
}

const READ_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [CONTEXT_ENGINE_READ],
};

const NO_CONTEXT_ENGINE_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { discover: ['read'] }, spaces: ['*'] }],
};

apiTest.describe('context engine dreaming templates API', { tag: tags.stateful.classic }, () => {
  let initialMemorySetting: { value: boolean | undefined } | undefined;

  apiTest.beforeAll(async ({ kbnClient }) => {
    const { data } = await kbnClient.request<GlobalUiSettingsResponse>({
      method: 'GET',
      path: GLOBAL_SETTINGS_PATH,
    });
    initialMemorySetting = {
      value: data.settings?.[CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID]?.userValue,
    };
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    if (!initialMemorySetting) {
      return;
    }
    if (initialMemorySetting.value === undefined) {
      await kbnClient.request({
        method: 'DELETE',
        path: `${GLOBAL_SETTINGS_PATH}/${CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID}`,
      });
    } else {
      await kbnClient.uiSettings.updateGlobal({
        [CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID]: initialMemorySetting.value,
      });
    }
    await kbnClient.uiSettings.waitForEventualCacheRefresh();
  });

  apiTest(
    'serves the built-in dreaming templates to a reader session only while memory is on',
    async ({ apiClient, kbnClient, samlAuth }) => {
      await kbnClient.uiSettings.updateGlobal({
        [CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID]: false,
      });
      await kbnClient.uiSettings.waitForEventualCacheRefresh();

      const { cookieHeader: readerCookie } = await samlAuth.asInteractiveUser(READ_ROLE);
      const readerHeaders = { ...INTERNAL_API_HEADERS, ...readerCookie };

      await apiTest.step('returns the memory-disabled 404 while memory is off', async () => {
        const offResponse = await apiClient.get(DREAMING_TEMPLATES_PATH, {
          headers: readerHeaders,
          responseType: 'json',
        });

        expect(offResponse).toHaveStatusCode(404);
        expect(offResponse.body).toMatchObject({
          message: 'Context Engine memory is turned off.',
        });
      });

      await kbnClient.uiSettings.updateGlobal({
        [CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID]: true,
      });
      await kbnClient.uiSettings.waitForEventualCacheRefresh();

      await apiTest.step(
        'returns the full example dreaming configs to a reader session while memory is on',
        async () => {
          const onResponse = await apiClient.get(DREAMING_TEMPLATES_PATH, {
            headers: readerHeaders,
            responseType: 'json',
          });

          expect(onResponse).toHaveStatusCode(200);
          expect(onResponse.body.templates).toStrictEqual(
            expect.arrayContaining([
              expect.objectContaining({
                id: 'customer_support',
                name: 'Customer support',
                description: expect.stringContaining('tickets'),
                summary: expect.stringContaining('Customer support'),
                rationale: expect.stringContaining('issues'),
                dreaming: {
                  instructions: expect.stringContaining('Record'),
                  facts: expect.arrayContaining([
                    expect.objectContaining({
                      type: 'solution',
                      description: expect.stringContaining('fix'),
                    }),
                  ]),
                  entities: {
                    nodes: expect.arrayContaining([
                      expect.objectContaining({
                        type: 'issue',
                        attributes: expect.arrayContaining(['severity']),
                      }),
                    ]),
                  },
                  relationships: expect.arrayContaining([
                    expect.objectContaining({
                      type: 'affects',
                      description: expect.stringContaining('issue'),
                    }),
                  ]),
                },
              }),
            ])
          );
        }
      );
    }
  );

  apiTest(
    'returns 403 to a session without Context Engine read access while memory is on',
    async ({ apiClient, kbnClient, samlAuth }) => {
      await kbnClient.uiSettings.updateGlobal({
        [CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID]: true,
      });
      await kbnClient.uiSettings.waitForEventualCacheRefresh();

      const { cookieHeader: unprivilegedCookie } =
        await samlAuth.asInteractiveUser(NO_CONTEXT_ENGINE_ROLE);
      const forbiddenResponse = await apiClient.get(DREAMING_TEMPLATES_PATH, {
        headers: { ...INTERNAL_API_HEADERS, ...unprivilegedCookie },
        responseType: 'json',
      });

      expect(forbiddenResponse).toHaveStatusCode(403);
    }
  );
});
