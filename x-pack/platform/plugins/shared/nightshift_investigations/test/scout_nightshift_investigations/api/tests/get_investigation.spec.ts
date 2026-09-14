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
  AGENTIC_INVESTIGATIONS_MANAGE_ROLE,
  NO_AGENT_BUILDER_ROLE,
  getInvestigation,
  upsertInvestigation,
  uniqueId,
} from '../fixtures';

/**
 * Tests for GET /internal/investigations/investigations/{id}
 *
 * Investigations are created via the POST (upsert) route. The nightshift-specific
 * GET route at /internal/nightshift/investigations/{id} has been removed.
 */
const TEST_ID = uniqueId('get-test-investigation');

apiTest.describe(
  'GET /internal/investigations/investigations/{id}',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let readCookieHeader: Record<string, string>;
    let manageCookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      ({ cookieHeader: readCookieHeader } = await samlAuth.asInteractiveUser(
        AGENTIC_INVESTIGATIONS_READ_ROLE
      ));
      ({ cookieHeader: manageCookieHeader } = await samlAuth.asInteractiveUser(
        AGENTIC_INVESTIGATIONS_MANAGE_ROLE
      ));
    });

    apiTest.beforeEach(async ({ apiClient }) => {
      await upsertInvestigation(apiClient, manageCookieHeader, {
        id: TEST_ID,
        status: 'completed',
        subjectType: 'alert',
        subjectId: 'alert-42',
        subjectSummary: 'Checkout API latency threshold',
        severity: '60-high',
        summary: 'All clear.',
        createdAt: '2024-06-01T10:00:00.000Z',
        startedAt: '2024-06-01T10:00:00.000Z',
        completedAt: '2024-06-01T11:00:00.000Z',
        impactedEntities: [{ name: 'checkout-service', nameText: 'checkout-service' }],
      });
    });

    apiTest('returns 404 for a non-existent investigation id', async ({ apiClient }) => {
      const response = await getInvestigation(
        apiClient,
        readCookieHeader,
        uniqueId('missing-get-investigation')
      );
      expect(response).toHaveStatusCode(404);
    });

    apiTest('returns the full investigation details in camelCase', async ({ apiClient }) => {
      const response = await getInvestigation(apiClient, readCookieHeader, TEST_ID);
      expect(response).toHaveStatusCode(200);

      expect(response.body.id).toBe(TEST_ID);
      expect(response.body.subjectType).toBe('alert');
      expect(response.body.subjectId).toBe('alert-42');
      expect(response.body.subjectSummary).toBe('Checkout API latency threshold');
      expect(response.body.status).toBe('completed');
      expect(response.body.severity).toBe('60-high');
      expect(response.body.createdAt).toBe('2024-06-01T10:00:00.000Z');
      expect(response.body.startedAt).toBe('2024-06-01T10:00:00.000Z');
      expect(response.body.completedAt).toBe('2024-06-01T11:00:00.000Z');
      expect(response.body.summary).toBe('All clear.');
      expect(response.body.impactedEntities).toStrictEqual([
        { name: 'checkout-service', nameText: 'checkout-service' },
      ]);
      // Fields absent from the agentic schema
      expect(response.body.investigation_id).toBeUndefined();
      expect(response.body.trigger_type).toBeUndefined();
    });

    apiTest(
      'returns 403 for a user without agenticInvestigations read privilege',
      async ({ apiClient, samlAuth }) => {
        const unauthorized = await samlAuth.asInteractiveUser(NO_AGENT_BUILDER_ROLE);
        const response = await getInvestigation(apiClient, unauthorized.cookieHeader, 'any-id');
        expect(response).toHaveStatusCode(403);
      }
    );
  }
);
