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
  getInvestigation,
  updateInvestigation,
  upsertInvestigation,
  uniqueId,
} from '../fixtures';

/**
 * Tests for PATCH /internal/nightshift/investigations/{id}
 *
 * The nightshift PATCH route updates an investigation's outcome fields (status,
 * summary, conclusion, impact, etc.). Test data is seeded via the
 * agenticInvestigations upsert route; verification reads use the agentic GET.
 */
apiTest.describe(
  'PATCH /internal/nightshift/investigations/{id}',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    const TEST_ID = uniqueId('persist-test-investigation');
    let adminCookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      ({ cookieHeader: adminCookieHeader } = await samlAuth.asInteractiveUser(
        COMBINED_INVESTIGATIONS_ADMIN_ROLE
      ));
    });

    apiTest.beforeEach(async ({ apiClient }) => {
      // Reset the investigation to a known running state before each test.
      await upsertInvestigation(apiClient, adminCookieHeader, {
        id: TEST_ID,
        status: 'running',
      });
    });

    apiTest('returns 400 when status is missing', async ({ apiClient }) => {
      const response = await updateInvestigation(apiClient, adminCookieHeader, TEST_ID, {});
      expect(response).toHaveStatusCode(400);
    });

    apiTest('returns 400 for an invalid status value', async ({ apiClient }) => {
      const response = await updateInvestigation(apiClient, adminCookieHeader, TEST_ID, {
        status: 'not_a_valid_status',
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest('returns 400 when pending is used as status', async ({ apiClient }) => {
      const response = await updateInvestigation(apiClient, adminCookieHeader, TEST_ID, {
        status: 'pending',
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest('returns 404 when the investigation does not exist', async ({ apiClient }) => {
      const response = await updateInvestigation(
        apiClient,
        adminCookieHeader,
        uniqueId('missing-update-investigation'),
        {
          status: 'completed',
          summary: 'All clear.',
        }
      );
      expect(response).toHaveStatusCode(404);
    });

    apiTest('updates status and structured output', async ({ apiClient }) => {
      const response = await updateInvestigation(apiClient, adminCookieHeader, TEST_ID, {
        status: 'completed',
        summary: 'Root cause identified.',
        conclusion: 'Memory leak in service X.',
        hypotheses: [{ candidate: 'memory leak', confidence: 0.95, status: 'confirmed' }],
        recommendations: [
          { title: 'Add memory alert', confidence: 0.7 },
          { title: 'Restart pod', confidence: 0.95 },
        ],
        blind_spots: [
          { title: 'Profiles', confidence: 0.6, description: 'Not available' },
          { title: 'Network logs', confidence: 0.8, description: 'Not available' },
        ],
        conversation_id: 'conv-persist-1',
        impact: { entities: [{ name: 'service-x' }] },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.acknowledged).toBe(true);

      // The nightshift PATCH route writes back to the shared investigations store.
      // Verify the persisted state via the agentic GET route.
      const getResponse = await getInvestigation(apiClient, adminCookieHeader, TEST_ID);
      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body.status).toBe('completed');
      expect(getResponse.body.summary).toBe('Root cause identified.');
    });

    apiTest('updates error field for failed investigations', async ({ apiClient }) => {
      const response = await updateInvestigation(apiClient, adminCookieHeader, TEST_ID, {
        status: 'failed',
        error: 'Agent timed out.',
      });
      expect(response).toHaveStatusCode(200);

      const getResponse = await getInvestigation(apiClient, adminCookieHeader, TEST_ID);
      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body.status).toBe('failed');
    });

    apiTest(
      'returns 409 when updating an investigation that already settled',
      async ({ apiClient }) => {
        // Override to settled before the update attempt.
        await upsertInvestigation(apiClient, adminCookieHeader, {
          id: TEST_ID,
          status: 'completed',
        });

        const response = await updateInvestigation(apiClient, adminCookieHeader, TEST_ID, {
          status: 'running',
        });
        expect(response).toHaveStatusCode(409);

        const getResponse = await getInvestigation(apiClient, adminCookieHeader, TEST_ID);
        expect(getResponse).toHaveStatusCode(200);
        expect(getResponse.body.status).toBe('completed');
      }
    );

    apiTest(
      'treats a replay of the same terminal status as an idempotent success',
      async ({ apiClient }) => {
        await upsertInvestigation(apiClient, adminCookieHeader, {
          id: TEST_ID,
          status: 'completed',
          summary: 'Original summary.',
        });

        const response = await updateInvestigation(apiClient, adminCookieHeader, TEST_ID, {
          status: 'completed',
          summary: 'Replayed summary.',
        });
        expect(response).toHaveStatusCode(200);

        const getResponse = await getInvestigation(apiClient, adminCookieHeader, TEST_ID);
        expect(getResponse).toHaveStatusCode(200);
        expect(getResponse.body.status).toBe('completed');
        // The original summary must not have been overwritten.
        expect(getResponse.body.summary).toBe('Original summary.');
      }
    );

    apiTest(
      'returns 403 for a user without agentBuilder:write',
      async ({ apiClient, samlAuth }) => {
        const unauthorized = await samlAuth.asInteractiveUser(AGENTIC_INVESTIGATIONS_READ_ROLE);
        const response = await updateInvestigation(apiClient, unauthorized.cookieHeader, 'any-id', {
          status: 'completed',
        });
        expect(response).toHaveStatusCode(403);
      }
    );
  }
);
