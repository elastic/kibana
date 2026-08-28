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
  NO_AGENT_BUILDER_ROLE,
  listInvestigations,
  seedInvestigation,
  deleteInvestigation,
  waitForInvestigation,
} from '../fixtures';

apiTest.describe(
  'GET /internal/nightshift/investigations',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    const IDS = ['list-inv-1', 'list-inv-2', 'list-inv-3'];
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ kbnClient, samlAuth }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_READ_ROLE));

      await seedInvestigation(kbnClient, {
        id: IDS[0],
        status: 'completed',
        subject_type: 'alert',
        subject_id: 'alert-1',
        trigger_type: 'automatic',
        created_at: '2024-06-01T10:00:00Z',
        completed_at: '2024-06-01T11:00:00Z',
        summary: 'First investigation.',
      });
      await seedInvestigation(kbnClient, {
        id: IDS[1],
        status: 'running',
        subject_type: 'significant_event',
        subject_id: 'se-1',
        trigger_type: 'manual',
        created_at: '2024-06-02T10:00:00Z',
      });
      await seedInvestigation(kbnClient, {
        id: IDS[2],
        status: 'failed',
        subject_type: 'alert',
        subject_id: 'alert-2',
        trigger_type: 'automatic',
        created_at: '2024-06-03T10:00:00Z',
        completed_at: '2024-06-03T10:30:00Z',
        error: 'Agent timed out.',
      });

      await waitForInvestigation(kbnClient, IDS[0]);
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      for (const id of IDS) {
        await deleteInvestigation(kbnClient, id);
      }
    });

    apiTest('returns 200 with a paginated result shape', async ({ apiClient }) => {
      const response = await listInvestigations(apiClient, cookieHeader);
      expect(response).toHaveStatusCode(200);
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(typeof response.body.total).toBe('number');
      expect(typeof response.body.page).toBe('number');
      expect(typeof response.body.size).toBe('number');
    });

    apiTest('returns seeded investigations', async ({ apiClient }) => {
      const response = await listInvestigations(apiClient, cookieHeader);
      expect(response).toHaveStatusCode(200);

      const ids = response.body.results.map(
        (r: { investigation_id: string }) => r.investigation_id
      );
      for (const id of IDS) {
        expect(ids).toContain(id);
      }
    });

    apiTest('each result has list fields without structured output', async ({ apiClient }) => {
      const response = await listInvestigations(apiClient, cookieHeader);
      expect(response).toHaveStatusCode(200);

      const inv = response.body.results.find(
        (r: { investigation_id: string }) => r.investigation_id === IDS[0]
      );
      expect(inv).toBeDefined();
      expect(inv.subject).toStrictEqual({ type: 'alert', id: 'alert-1' });
      expect(inv.trigger_type).toBe('automatic');
      expect(inv.status).toBe('completed');
      expect(inv.started_at).toBe('2024-06-01T10:00:00Z');
      expect(inv.summary).toBe('First investigation.');
      expect(inv.conclusion).toBeUndefined();
      expect(inv.hypotheses).toBeUndefined();
      expect(inv.recommendations).toBeUndefined();
      expect(inv.blind_spots).toBeUndefined();
      expect(inv.impact).toBeUndefined();
      expect(inv.conversation_id).toBeUndefined();
    });

    apiTest('filters by status', async ({ apiClient }) => {
      const response = await listInvestigations(apiClient, cookieHeader, {
        query: 'statuses=running',
      });
      expect(response).toHaveStatusCode(200);

      const statuses = response.body.results.map((r: { status: string }) => r.status);
      for (const status of statuses) {
        expect(status).toBe('running');
      }
    });

    apiTest('supports pagination with page and size', async ({ apiClient }) => {
      const response = await listInvestigations(apiClient, cookieHeader, {
        query: 'page=1&size=1',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.results.length).toBeLessThanOrEqual(1);
      expect(response.body.page).toBe(1);
      expect(response.body.size).toBe(1);
    });

    apiTest('returns 400 when page exceeds the maximum of 100', async ({ apiClient }) => {
      const response = await listInvestigations(apiClient, cookieHeader, { query: 'page=101' });
      expect(response).toHaveStatusCode(400);
    });

    apiTest('returns 400 for an unrecognised status value', async ({ apiClient }) => {
      const response = await listInvestigations(apiClient, cookieHeader, {
        query: 'statuses=not_a_status',
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest('returns 400 for an invalid sort_field value', async ({ apiClient }) => {
      const response = await listInvestigations(apiClient, cookieHeader, {
        query: 'sort_field=unknown_field',
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest('returns 403 for a user without agentBuilder:read', async ({ apiClient, samlAuth }) => {
      const unauthorized = await samlAuth.asInteractiveUser(NO_AGENT_BUILDER_ROLE);
      const response = await listInvestigations(apiClient, unauthorized.cookieHeader);
      expect(response).toHaveStatusCode(403);
    });
  }
);
