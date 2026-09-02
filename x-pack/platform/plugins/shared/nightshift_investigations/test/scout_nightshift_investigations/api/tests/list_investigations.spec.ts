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
} from '../fixtures';

apiTest.describe(
  'GET /internal/nightshift/investigations',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    const IDS = ['list-inv-1', 'list-inv-2', 'list-inv-3', 'list-inv-4'];
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
        started_at: '2024-06-01T10:00:00Z',
        completed_at: '2024-06-01T11:00:00Z',
        summary: 'First investigation.',
        conclusion: 'Resolved.',
      });
      await seedInvestigation(kbnClient, {
        id: IDS[1],
        status: 'running',
        subject_type: 'significant_event',
        subject_id: 'se-1',
        trigger_type: 'manual',
        created_at: '2024-06-02T10:00:00Z',
        started_at: '2024-06-02T10:00:00Z',
      });
      await seedInvestigation(kbnClient, {
        id: IDS[2],
        status: 'failed',
        subject_type: 'alert',
        subject_id: 'alert-2',
        trigger_type: 'automatic',
        created_at: '2024-06-03T10:00:00Z',
        started_at: '2024-06-03T10:00:00Z',
        completed_at: '2024-06-03T10:30:00Z',
        error: 'Agent timed out.',
      });
      await seedInvestigation(kbnClient, {
        id: IDS[3],
        status: 'pending',
        subject_type: 'alert',
        subject_id: 'alert-3',
        trigger_type: 'automatic',
        created_at: '2024-06-04T10:00:00Z',
      });
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
      expect(inv.status).toBe('completed');
      expect(inv.created_at).toBe('2024-06-01T10:00:00Z');
      expect(inv.started_at).toBe('2024-06-01T10:00:00Z');
      expect(inv.completed_at).toBe('2024-06-01T11:00:00Z');
      expect(inv.subject).toBeUndefined();
      expect(inv.trigger_type).toBeUndefined();
      expect(inv.summary).toBeUndefined();
      expect(inv.conclusion).toBeUndefined();
      expect(inv.error).toBeUndefined();
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

    apiTest('reports a pending investigation as created but not started', async ({ apiClient }) => {
      const response = await listInvestigations(apiClient, cookieHeader, {
        query: 'statuses=pending',
      });
      expect(response).toHaveStatusCode(200);

      const inv = response.body.results.find(
        (r: { investigation_id: string }) => r.investigation_id === IDS[3]
      );
      expect(inv).toBeDefined();
      expect(inv.created_at).toBe('2024-06-04T10:00:00Z');
      expect(inv.started_at).toBeUndefined();
    });

    apiTest('filters by created_after and created_before', async ({ apiClient }) => {
      const response = await listInvestigations(apiClient, cookieHeader, {
        query: 'created_after=2024-06-02T00:00:00Z&created_before=2024-06-03T00:00:00Z',
      });
      expect(response).toHaveStatusCode(200);

      const ids = response.body.results.map(
        (r: { investigation_id: string }) => r.investigation_id
      );
      expect(ids).toContain(IDS[1]);
      expect(ids).not.toContain(IDS[0]);
      expect(ids).not.toContain(IDS[2]);
    });

    apiTest('matches a pending investigation on created_after only', async ({ apiClient }) => {
      const createdOnly = await listInvestigations(apiClient, cookieHeader, {
        query: 'created_after=2024-06-04T00:00:00Z',
      });
      expect(createdOnly).toHaveStatusCode(200);
      expect(
        createdOnly.body.results.map((r: { investigation_id: string }) => r.investigation_id)
      ).toContain(IDS[3]);

      const startedOnly = await listInvestigations(apiClient, cookieHeader, {
        query: 'started_after=2024-06-04T00:00:00Z',
      });
      expect(startedOnly).toHaveStatusCode(200);
      expect(
        startedOnly.body.results.map((r: { investigation_id: string }) => r.investigation_id)
      ).not.toContain(IDS[3]);
    });

    apiTest('returns 400 for a non-datetime created_after value', async ({ apiClient }) => {
      const response = await listInvestigations(apiClient, cookieHeader, {
        query: 'created_after=yesterday',
      });
      expect(response).toHaveStatusCode(400);
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
