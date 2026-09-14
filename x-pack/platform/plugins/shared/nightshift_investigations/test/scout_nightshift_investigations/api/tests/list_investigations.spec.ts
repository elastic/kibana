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
  listInvestigations,
  upsertInvestigation,
  uniqueId,
} from '../fixtures';

/**
 * Tests for GET /internal/investigations/investigations
 *
 * The agenticInvestigations plugin exposes this route with versioned access.
 * Investigations are seeded via the POST (upsert) route; the nightshift-specific
 * list route at /internal/nightshift/investigations has been removed.
 */
apiTest.describe(
  'GET /internal/investigations/investigations',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    /**
     * A unique entity name anchors every seeded investigation in this suite so the
     * list-with-filter queries return only our data, regardless of what other test
     * runs may have left in the shared index.
     */
    const testEntityName = uniqueId('list-test-entity');

    const IDS = [
      uniqueId('list-inv-1'),
      uniqueId('list-inv-2'),
      uniqueId('list-inv-3'),
      uniqueId('list-inv-4'),
    ];

    let readCookieHeader: Record<string, string>;
    let manageCookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ apiClient, samlAuth }) => {
      ({ cookieHeader: readCookieHeader } = await samlAuth.asInteractiveUser(
        AGENTIC_INVESTIGATIONS_READ_ROLE
      ));
      ({ cookieHeader: manageCookieHeader } = await samlAuth.asInteractiveUser(
        AGENTIC_INVESTIGATIONS_MANAGE_ROLE
      ));

      // Seed four investigations, all sharing the same impacted entity so the
      // impactedEntityName filter can scope assertions to this suite only.
      await upsertInvestigation(apiClient, manageCookieHeader, {
        id: IDS[0],
        status: 'completed',
        subjectType: 'alert',
        subjectId: 'alert-1',
        severity: '40-medium',
        summary: 'First investigation.',
        impactedEntities: [{ name: testEntityName, nameText: testEntityName }],
      });
      await upsertInvestigation(apiClient, manageCookieHeader, {
        id: IDS[1],
        status: 'running',
        subjectType: 'significant_event',
        subjectId: 'se-1',
        severity: '60-high',
        impactedEntities: [{ name: testEntityName, nameText: testEntityName }],
      });
      await upsertInvestigation(apiClient, manageCookieHeader, {
        id: IDS[2],
        status: 'failed',
        subjectType: 'alert',
        subjectId: 'alert-2',
        severity: '80-critical',
        impactedEntities: [{ name: testEntityName, nameText: testEntityName }],
      });
      await upsertInvestigation(apiClient, manageCookieHeader, {
        id: IDS[3],
        status: 'pending',
        subjectType: 'alert',
        subjectId: 'alert-3',
        impactedEntities: [{ name: testEntityName, nameText: testEntityName }],
      });
    });

    apiTest('returns 200 with the expected response shape', async ({ apiClient }) => {
      const response = await listInvestigations(apiClient, readCookieHeader);
      expect(response).toHaveStatusCode(200);
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(typeof response.body.total).toBe('number');
      expect(typeof response.body.severityCounts).toBe('object');
    });

    apiTest('returns seeded investigations filtered by entity name', async ({ apiClient }) => {
      const response = await listInvestigations(apiClient, readCookieHeader, {
        query: `impactedEntityName=${encodeURIComponent(testEntityName)}`,
      });
      expect(response).toHaveStatusCode(200);

      const ids = response.body.items.map((r: { id: string }) => r.id);
      for (const id of IDS) {
        expect(ids).toContain(id);
      }
    });

    apiTest('each result exposes camelCase investigation fields', async ({ apiClient }) => {
      const response = await listInvestigations(apiClient, readCookieHeader, {
        query: `impactedEntityName=${encodeURIComponent(testEntityName)}&status=completed`,
      });
      expect(response).toHaveStatusCode(200);

      const inv = response.body.items.find((r: { id: string }) => r.id === IDS[0]);
      expect(inv).toBeDefined();
      expect(inv.status).toBe('completed');
      expect(inv.subjectType).toBe('alert');
      expect(inv.subjectId).toBe('alert-1');
      expect(inv.summary).toBe('First investigation.');
      expect(inv.severity).toBe('40-medium');
      // Fields not in the agentic list response
      expect(inv.triggerType).toBeUndefined();
    });

    apiTest('filters by status', async ({ apiClient }) => {
      const response = await listInvestigations(apiClient, readCookieHeader, {
        query: `status=running&impactedEntityName=${encodeURIComponent(testEntityName)}`,
      });
      expect(response).toHaveStatusCode(200);

      const results = response.body.items as Array<{ id: string; status: string }>;
      expect(results.map((r) => r.id)).toContain(IDS[1]);
      for (const result of results) {
        expect(result.status).toBe('running');
      }
    });

    apiTest('filters by severity', async ({ apiClient }) => {
      const response = await listInvestigations(apiClient, readCookieHeader, {
        query: `severity=60-high&impactedEntityName=${encodeURIComponent(testEntityName)}`,
      });
      expect(response).toHaveStatusCode(200);

      const results = response.body.items as Array<{ id: string; severity: string }>;
      expect(results.map((r) => r.id)).toContain(IDS[1]);
      for (const result of results) {
        expect(result.severity).toBe('60-high');
      }
    });

    apiTest('supports from/size pagination', async ({ apiClient }) => {
      const response = await listInvestigations(apiClient, readCookieHeader, {
        query: `from=0&size=1&impactedEntityName=${encodeURIComponent(testEntityName)}`,
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.items.length).toBeLessThanOrEqual(1);
    });

    apiTest('returns 400 for a size above the maximum of 100', async ({ apiClient }) => {
      const response = await listInvestigations(apiClient, readCookieHeader, {
        query: 'size=101',
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest('returns 400 for a negative from value', async ({ apiClient }) => {
      const response = await listInvestigations(apiClient, readCookieHeader, {
        query: 'from=-1',
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest(
      'returns 403 for a user without agenticInvestigations read privilege',
      async ({ apiClient, samlAuth }) => {
        const unauthorized = await samlAuth.asInteractiveUser(NO_AGENT_BUILDER_ROLE);
        const response = await listInvestigations(apiClient, unauthorized.cookieHeader);
        expect(response).toHaveStatusCode(403);
      }
    );

    apiTest('returns severityCounts in the list response', async ({ apiClient }) => {
      const response = await listInvestigations(apiClient, readCookieHeader, {
        query: `impactedEntityName=${encodeURIComponent(testEntityName)}`,
      });
      expect(response).toHaveStatusCode(200);

      const { severityCounts } = response.body as { severityCounts: Record<string, number> };
      // The three investigations with severity set must appear in counts.
      expect(severityCounts['80-critical']).toBeGreaterThanOrEqual(1);
      expect(severityCounts['60-high']).toBeGreaterThanOrEqual(1);
      expect(severityCounts['40-medium']).toBeGreaterThanOrEqual(1);
    });
  }
);
