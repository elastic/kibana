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
  seedInvestigation,
  deleteInvestigation,
  getInvestigation,
  updateInvestigation,
  uniqueId,
} from '../fixtures';

apiTest.describe(
  'PATCH /internal/nightshift/investigations/{id}',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    const TEST_ID = uniqueId('persist-test-investigation');
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_WRITE_ROLE));
    });

    apiTest.beforeEach(async ({ kbnClient }) => {
      await seedInvestigation(kbnClient, { id: TEST_ID, status: 'running' });
    });

    apiTest.afterEach(async ({ kbnClient }) => {
      await deleteInvestigation(kbnClient, TEST_ID);
    });

    apiTest('returns 400 when status is missing', async ({ apiClient }) => {
      const response = await updateInvestigation(apiClient, cookieHeader, TEST_ID, {});
      expect(response).toHaveStatusCode(400);
    });

    apiTest('returns 400 for an invalid status value', async ({ apiClient }) => {
      const response = await updateInvestigation(apiClient, cookieHeader, TEST_ID, {
        status: 'not_a_valid_status',
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest('returns 400 when pending is used as status', async ({ apiClient }) => {
      const response = await updateInvestigation(apiClient, cookieHeader, TEST_ID, {
        status: 'pending',
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest('returns 404 when the investigation does not exist', async ({ apiClient }) => {
      const response = await updateInvestigation(
        apiClient,
        cookieHeader,
        uniqueId('missing-update-investigation'),
        {
          status: 'completed',
          summary: 'All clear.',
        }
      );
      expect(response).toHaveStatusCode(404);
    });

    apiTest('updates status and structured output', async ({ apiClient }) => {
      const response = await updateInvestigation(apiClient, cookieHeader, TEST_ID, {
        status: 'completed',
        summary: 'Root cause identified.',
        conclusion: 'Memory leak in service X.',
        hypotheses: [{ candidate: 'memory leak', confidence: 0.95, status: 'confirmed' }],
        recommendations: [{ title: 'Restart pod' }],
        blind_spots: [{ title: 'Network logs', description: 'Not available' }],
        conversation_id: 'conv-persist-1',
        impact: { entities: [{ name: 'service-x' }] },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.acknowledged).toBe(true);

      const investigationRequest = await getInvestigation(apiClient, cookieHeader, TEST_ID);
      expect(investigationRequest).toHaveStatusCode(200);
      expect(investigationRequest.body.status).toBe('completed');
      expect(investigationRequest.body.summary).toBe('Root cause identified.');
      expect(investigationRequest.body.conclusion).toBe('Memory leak in service X.');
      expect(investigationRequest.body.hypotheses).toStrictEqual([
        { candidate: 'memory leak', confidence: 0.95, status: 'confirmed' },
      ]);
      expect(investigationRequest.body.recommendations).toStrictEqual([{ title: 'Restart pod' }]);
      expect(investigationRequest.body.blind_spots).toStrictEqual([
        { title: 'Network logs', description: 'Not available' },
      ]);
      expect(investigationRequest.body.conversation_id).toBe('conv-persist-1');
      expect(investigationRequest.body.impact).toStrictEqual({ entities: [{ name: 'service-x' }] });
      expect(investigationRequest.body.completed_at).toBeDefined();
    });

    apiTest('updates error field for failed investigations', async ({ apiClient }) => {
      const response = await updateInvestigation(apiClient, cookieHeader, TEST_ID, {
        status: 'failed',
        error: 'Agent timed out.',
      });
      expect(response).toHaveStatusCode(200);

      const investigationRequest = await getInvestigation(apiClient, cookieHeader, TEST_ID);
      expect(investigationRequest).toHaveStatusCode(200);
      expect(investigationRequest.body.status).toBe('failed');
      expect(investigationRequest.body.error).toBe('Agent timed out.');
      expect(investigationRequest.body.completed_at).toBeDefined();
    });

    apiTest(
      'returns 409 when updating an investigation that already settled',
      async ({ apiClient, kbnClient }) => {
        await seedInvestigation(kbnClient, { id: TEST_ID, status: 'completed' });

        const response = await updateInvestigation(apiClient, cookieHeader, TEST_ID, {
          status: 'running',
        });
        expect(response).toHaveStatusCode(409);

        const investigationRequest = await getInvestigation(apiClient, cookieHeader, TEST_ID);
        expect(investigationRequest).toHaveStatusCode(200);
        expect(investigationRequest.body.status).toBe('completed');
      }
    );

    apiTest(
      'treats a replay of the same terminal status as an idempotent success',
      async ({ apiClient, kbnClient }) => {
        await seedInvestigation(kbnClient, {
          id: TEST_ID,
          status: 'completed',
          summary: 'Original summary.',
        });

        const response = await updateInvestigation(apiClient, cookieHeader, TEST_ID, {
          status: 'completed',
          summary: 'Replayed summary.',
        });
        expect(response).toHaveStatusCode(200);

        const investigationRequest = await getInvestigation(apiClient, cookieHeader, TEST_ID);
        expect(investigationRequest).toHaveStatusCode(200);
        expect(investigationRequest.body.status).toBe('completed');
        expect(investigationRequest.body.summary).toBe('Original summary.');
      }
    );

    apiTest(
      'returns 403 for a user without agentBuilder:write',
      async ({ apiClient, samlAuth }) => {
        const unauthorized = await samlAuth.asInteractiveUser(INVESTIGATIONS_READ_ROLE);
        const response = await updateInvestigation(apiClient, unauthorized.cookieHeader, 'any-id', {
          status: 'completed',
        });
        expect(response).toHaveStatusCode(403);
      }
    );
  }
);
