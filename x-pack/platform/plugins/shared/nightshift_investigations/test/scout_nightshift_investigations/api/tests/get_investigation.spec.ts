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
  NO_AGENT_BUILDER_ROLE,
  seedInvestigation,
  deleteInvestigation,
} from '../fixtures';

const TEST_ID = 'get-test-investigation';

const getInvestigation = async (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  id: string
) =>
  apiClient.get(`internal/nightshift/investigations/${id}`, {
    headers: { ...COMMON_HEADERS, ...cookieHeader },
    responseType: 'json',
  });

apiTest.describe(
  'GET /internal/nightshift/investigations/{id}',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_READ_ROLE));
    });

    apiTest.beforeEach(async ({ kbnClient }) => {
      await seedInvestigation(kbnClient, {
        id: TEST_ID,
        status: 'completed',
        subject_type: 'alert',
        subject_id: 'alert-42',
        trigger_type: 'automatic',
        executed_by: 'test-user',
        created_at: '2024-06-01T10:00:00Z',
        completed_at: '2024-06-01T11:00:00Z',
        summary: 'All clear.',
        conclusion: 'No issues found.',
      });
    });

    apiTest.afterEach(async ({ kbnClient }) => {
      await deleteInvestigation(kbnClient, TEST_ID);
    });

    apiTest('returns 404 for a non-existent investigation id', async ({ apiClient }) => {
      const response = await getInvestigation(apiClient, cookieHeader, 'non-existent-id');
      expect(response).toHaveStatusCode(404);
    });

    apiTest('returns the full investigation details', async ({ apiClient }) => {
      const response = await getInvestigation(apiClient, cookieHeader, TEST_ID);
      expect(response).toHaveStatusCode(200);

      expect(response.body.investigation_id).toBe(TEST_ID);
      expect(response.body.subject).toStrictEqual({ type: 'alert', id: 'alert-42' });
      expect(response.body.trigger_type).toBe('automatic');
      expect(response.body.status).toBe('completed');
      expect(response.body.started_at).toBe('2024-06-01T10:00:00Z');
      expect(response.body.completed_at).toBe('2024-06-01T11:00:00Z');
      expect(response.body.executed_by).toBe('test-user');
      expect(response.body.summary).toBe('All clear.');
      expect(response.body.conclusion).toBe('No issues found.');
    });

    apiTest('returns 403 for a user without agentBuilder:read', async ({ apiClient, samlAuth }) => {
      const unauthorized = await samlAuth.asInteractiveUser(NO_AGENT_BUILDER_ROLE);
      const response = await getInvestigation(apiClient, unauthorized.cookieHeader, 'any-id');
      expect(response).toHaveStatusCode(403);
    });
  }
);
