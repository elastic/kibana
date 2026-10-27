/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import type { KbnClient, RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

const REMEMBER_PATH = 'api/context_engine/memory/_remember';
const FORGET_PATH = 'api/context_engine/memory/_forget';
const DREAMING_PATH = 'internal/context_engine/memory/dreaming';
const DREAMING_DISABLE_PATH = `${DREAMING_PATH}/_disable`;
const DREAMING_RUN_PATH = `${DREAMING_PATH}/_run`;

const DAY_MS = 24 * 60 * 60 * 1000;

const memoryBody = {
  type: 'memory.session_fact',
  title: 'Scout memory',
  description: 'Written by the Scout memory API suite',
  content: 'The Scout suite prefers short answers.',
};

apiTest.describe('context engine memory API', { tag: tags.stateful.classic }, () => {
  let adminCredentials: RoleApiCredentials;
  let viewerCredentials: RoleApiCredentials;

  const setMemoryEnabled = async (kbnClient: KbnClient, enabled: boolean) => {
    await kbnClient.uiSettings.updateGlobal({
      [CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID]: enabled,
    });
    await kbnClient.uiSettings.waitForEventualCacheRefresh();
  };

  apiTest.beforeAll(async ({ requestAuth }) => {
    adminCredentials = await requestAuth.getApiKey('admin');
    viewerCredentials = await requestAuth.getApiKey('viewer');
  });

  apiTest.afterAll(async ({ kbnClient }) => {
    await setMemoryEnabled(kbnClient, false);
  });

  apiTest(
    'returns 404 on every memory route while memory is off',
    async ({ apiClient, kbnClient }) => {
      await setMemoryEnabled(kbnClient, false);
      const headers = { ...adminCredentials.apiKeyHeader, ...testData.API_HEADERS };
      const internalHeaders = {
        ...adminCredentials.apiKeyHeader,
        ...testData.INTERNAL_API_HEADERS,
      };

      const remember = await apiClient.post(REMEMBER_PATH, {
        headers,
        responseType: 'json',
        body: memoryBody,
      });
      expect(remember).toHaveStatusCode(404);

      const forget = await apiClient.post(FORGET_PATH, {
        headers,
        responseType: 'json',
        body: { id: 'missing' },
      });
      expect(forget).toHaveStatusCode(404);

      const dreaming = await apiClient.get(DREAMING_PATH, {
        headers: internalHeaders,
        responseType: 'json',
      });
      expect(dreaming).toHaveStatusCode(404);
    }
  );

  apiTest('rejects an expiry beyond 90 days', async ({ apiClient, kbnClient }) => {
    await setMemoryEnabled(kbnClient, true);

    const response = await apiClient.post(REMEMBER_PATH, {
      headers: { ...adminCredentials.apiKeyHeader, ...testData.API_HEADERS },
      responseType: 'json',
      body: { ...memoryBody, expires_at: new Date(Date.now() + 91 * DAY_MS).toISOString() },
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toContain('90 days');
  });

  apiTest('rejects long-term memory types', async ({ apiClient, kbnClient }) => {
    await setMemoryEnabled(kbnClient, true);

    const response = await apiClient.post(REMEMBER_PATH, {
      headers: { ...adminCredentials.apiKeyHeader, ...testData.API_HEADERS },
      responseType: 'json',
      body: { ...memoryBody, type: 'memory.fact' },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('requires the Context Engine write privilege', async ({ apiClient, kbnClient }) => {
    await setMemoryEnabled(kbnClient, true);

    const response = await apiClient.post(REMEMBER_PATH, {
      headers: { ...viewerCredentials.apiKeyHeader, ...testData.API_HEADERS },
      responseType: 'json',
      body: memoryBody,
    });

    expect(response).toHaveStatusCode(403);
  });

  apiTest('reports dreaming as off until it is turned on', async ({ apiClient, kbnClient }) => {
    await setMemoryEnabled(kbnClient, true);
    const headers = { ...adminCredentials.apiKeyHeader, ...testData.INTERNAL_API_HEADERS };

    const disabled = await apiClient.post(DREAMING_DISABLE_PATH, { headers, responseType: 'json' });
    expect(disabled).toHaveStatusCode(200);
    expect(disabled.body.enabled).toBe(false);

    const status = await apiClient.get(DREAMING_PATH, { headers, responseType: 'json' });
    expect(status).toHaveStatusCode(200);
    expect(status.body).toStrictEqual({ enabled: false, interval: '24h' });

    const run = await apiClient.post(DREAMING_RUN_PATH, { headers, responseType: 'json' });
    expect(run).toHaveStatusCode(409);
  });
});
