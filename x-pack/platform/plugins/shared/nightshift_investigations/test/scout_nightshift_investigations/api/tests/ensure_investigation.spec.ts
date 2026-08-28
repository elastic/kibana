/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { ApiClientFixture } from '@kbn/scout';
import {
  apiTest,
  COMMON_HEADERS,
  INVESTIGATIONS_READ_ROLE,
  INVESTIGATIONS_WRITE_ROLE,
  seedInvestigation,
  deleteInvestigation,
} from '../fixtures';

const ensureInvestigation = async (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  id: string
) =>
  apiClient.post(`internal/nightshift/investigations/${id}/_ensure`, {
    headers: { ...COMMON_HEADERS, ...cookieHeader },
    responseType: 'json',
  });

apiTest.describe(
  'POST /internal/nightshift/investigations/{id}/_ensure',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    const TEST_ID = 'ensure-test-investigation';
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_WRITE_ROLE));
    });

    apiTest.afterEach(async ({ kbnClient }) => {
      await deleteInvestigation(kbnClient, TEST_ID);
    });

    apiTest(
      'acknowledges without side effects when the saved object already exists',
      async ({ apiClient, kbnClient }) => {
        await seedInvestigation(kbnClient, { id: TEST_ID, status: 'completed' });

        const response = await ensureInvestigation(apiClient, cookieHeader, TEST_ID);
        expect(response).toHaveStatusCode(200);
        expect(response.body.acknowledged).toBe(true);

        const so = await kbnClient.savedObjects.get({
          type: 'nightshift-investigation',
          id: TEST_ID,
        });
        expect(so.attributes.status).toBe('completed');
      }
    );

    apiTest(
      'returns 404 when no saved object and no matching workflow execution exist',
      async ({ apiClient }) => {
        const response = await ensureInvestigation(apiClient, cookieHeader, 'non-existent-id');
        expect(response).toHaveStatusCode(404);
      }
    );

    apiTest(
      'returns 403 for a user without agentBuilder:write',
      async ({ apiClient, samlAuth }) => {
        const unauthorized = await samlAuth.asInteractiveUser(INVESTIGATIONS_READ_ROLE);
        const response = await ensureInvestigation(apiClient, unauthorized.cookieHeader, 'any-id');
        expect(response).toHaveStatusCode(403);
      }
    );
  }
);
