/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import {
  apiTest,
  INVESTIGATIONS_READ_ROLE,
  INVESTIGATIONS_WRITE_ROLE,
  ensureInvestigation,
  seedInvestigation,
  deleteInvestigation,
  getInvestigation,
  uniqueId,
} from '../fixtures';

apiTest.describe(
  'POST /internal/nightshift/investigations/{id}/_ensure',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    const TEST_ID = uniqueId('ensure-test-investigation');
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_WRITE_ROLE));
    });

    apiTest.afterEach(async ({ kbnClient }) => {
      await deleteInvestigation(kbnClient, TEST_ID);
    });

    apiTest(
      'acknowledges without side effects when the investigation is already running',
      async ({ apiClient, kbnClient }) => {
        await seedInvestigation(kbnClient, { id: TEST_ID, status: 'running' });

        const response = await ensureInvestigation(apiClient, cookieHeader, TEST_ID);
        expect(response).toHaveStatusCode(200);
        expect(response.body.acknowledged).toBe(true);

        const investigationRequest = await getInvestigation(apiClient, cookieHeader, TEST_ID);
        expect(investigationRequest).toHaveStatusCode(200);
        expect(investigationRequest.body.status).toBe('running');
      }
    );

    apiTest(
      'returns 409 when the investigation is already settled',
      async ({ apiClient, kbnClient }) => {
        await seedInvestigation(kbnClient, { id: TEST_ID, status: 'completed' });

        const response = await ensureInvestigation(apiClient, cookieHeader, TEST_ID);
        expect(response).toHaveStatusCode(409);

        const investigationRequest = await getInvestigation(apiClient, cookieHeader, TEST_ID);
        expect(investigationRequest).toHaveStatusCode(200);
        expect(investigationRequest.body.status).toBe('completed');
      }
    );

    apiTest(
      'returns 404 when no investigation record and no matching workflow execution exist',
      async ({ apiClient }) => {
        const response = await ensureInvestigation(
          apiClient,
          cookieHeader,
          uniqueId('missing-ensure-investigation')
        );
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
