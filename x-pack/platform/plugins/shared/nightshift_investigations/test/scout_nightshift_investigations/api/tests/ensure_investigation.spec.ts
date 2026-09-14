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
  AGENTIC_INVESTIGATIONS_READ_ROLE,
  COMBINED_INVESTIGATIONS_ADMIN_ROLE,
  ensureInvestigation,
  getInvestigation,
  upsertInvestigation,
  uniqueId,
} from '../fixtures';

/**
 * Tests for POST /internal/nightshift/investigations/{id}/_ensure
 *
 * The _ensure route is nightshift-owned and verifies that a running investigation
 * is still live. Test data is seeded via the agenticInvestigations upsert route
 * (nightshift-investigation SO type has been removed).
 */
apiTest.describe(
  'POST /internal/nightshift/investigations/{id}/_ensure',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    const TEST_ID = uniqueId('ensure-test-investigation');
    let adminCookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      ({ cookieHeader: adminCookieHeader } = await samlAuth.asInteractiveUser(
        COMBINED_INVESTIGATIONS_ADMIN_ROLE
      ));
    });

    apiTest(
      'acknowledges without side effects when the investigation is already running',
      async ({ apiClient }) => {
        await upsertInvestigation(apiClient, adminCookieHeader, {
          id: TEST_ID,
          status: 'running',
        });

        const response = await ensureInvestigation(apiClient, adminCookieHeader, TEST_ID);
        expect(response).toHaveStatusCode(200);
        expect(response.body.acknowledged).toBe(true);

        // Verify the investigation record was not mutated.
        const getResponse = await getInvestigation(apiClient, adminCookieHeader, TEST_ID);
        expect(getResponse).toHaveStatusCode(200);
        expect(getResponse.body.status).toBe('running');
      }
    );

    apiTest('returns 409 when the investigation is already settled', async ({ apiClient }) => {
      await upsertInvestigation(apiClient, adminCookieHeader, {
        id: TEST_ID,
        status: 'completed',
      });

      const response = await ensureInvestigation(apiClient, adminCookieHeader, TEST_ID);
      expect(response).toHaveStatusCode(409);

      // Verify the investigation record was not mutated.
      const getResponse = await getInvestigation(apiClient, adminCookieHeader, TEST_ID);
      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body.status).toBe('completed');
    });

    apiTest(
      'returns 404 when no investigation record and no matching workflow execution exist',
      async ({ apiClient }) => {
        const response = await ensureInvestigation(
          apiClient,
          adminCookieHeader,
          uniqueId('missing-ensure-investigation')
        );
        expect(response).toHaveStatusCode(404);
      }
    );

    apiTest(
      'returns 403 for a user without agentBuilder:write',
      async ({ apiClient, samlAuth }) => {
        const unauthorized = await samlAuth.asInteractiveUser(AGENTIC_INVESTIGATIONS_READ_ROLE);
        const response = await ensureInvestigation(apiClient, unauthorized.cookieHeader, 'any-id');
        expect(response).toHaveStatusCode(403);
      }
    );
  }
);
