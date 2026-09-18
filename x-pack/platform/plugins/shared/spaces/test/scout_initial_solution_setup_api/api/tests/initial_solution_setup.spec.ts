/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { COMMON_HEADERS } from '../fixtures/constants';

const GET_SETUP_PATH = 'internal/spaces/_initial_solution_setup';
const COMPLETE_SETUP_PATH = 'internal/spaces/_complete_initial_solution_setup';

apiTest.describe('Initial solution setup API', { tag: tags.stateful.classic }, () => {
  // Setup is a one-way, cluster-wide transition. The API and UI suites use separate Scout
  // config sets to get fresh servers; a retry cannot restore state after completion.

  let adminCookieHeader: Record<string, string>;
  let viewerCookieHeader: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    ({ cookieHeader: adminCookieHeader } = await samlAuth.asInteractiveUser('admin'));
    ({ cookieHeader: viewerCookieHeader } = await samlAuth.asInteractiveUser('viewer'));
  });

  apiTest('enforces authorization and completes setup', async ({ apiClient, apiServices }) => {
    await apiTest.step('viewer cannot read or complete setup', async () => {
      const getResponse = await apiClient.get(GET_SETUP_PATH, {
        headers: { ...COMMON_HEADERS, ...viewerCookieHeader },
      });
      expect(getResponse).toHaveStatusCode(403);

      const postResponse = await apiClient.post(COMPLETE_SETUP_PATH, {
        headers: { ...COMMON_HEADERS, ...viewerCookieHeader },
        body: { solution: 'es' },
      });
      expect(postResponse).toHaveStatusCode(403);
    });

    await apiTest.step('admin sees pending setup', async () => {
      const response = await apiClient.get(GET_SETUP_PATH, {
        headers: { ...COMMON_HEADERS, ...adminCookieHeader },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ required: true });
    });

    await apiTest.step('admin completes setup', async () => {
      const response = await apiClient.post(COMPLETE_SETUP_PATH, {
        headers: { ...COMMON_HEADERS, ...adminCookieHeader },
        body: { solution: 'es' },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ solution: 'es' });

      const defaultSpace = await apiServices.spaces.get('default');
      expect(defaultSpace).toStrictEqual(expect.objectContaining({ solution: 'es' }));
    });

    await apiTest.step('setup remains complete', async () => {
      const response = await apiClient.get(GET_SETUP_PATH, {
        headers: { ...COMMON_HEADERS, ...adminCookieHeader },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ required: false });
    });
  });
});
