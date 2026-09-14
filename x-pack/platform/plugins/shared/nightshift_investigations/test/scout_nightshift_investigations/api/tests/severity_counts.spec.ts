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
  listInvestigations,
  upsertInvestigation,
  uniqueId,
} from '../fixtures';

/**
 * Tests for the `severityCounts` tile returned by
 * GET /internal/investigations/investigations.
 *
 * The tile must reflect counts across the unfiltered result set even when a
 * `severity` query param scopes the `items` array — this is the "stable when
 * filtering" contract described in the spec.
 */
apiTest.describe(
  'severityCounts in GET /internal/investigations/investigations',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    // A unique entity name anchors this suite's investigations in the shared index.
    const testEntityName = uniqueId('severity-counts-entity');

    let readCookieHeader: Record<string, string>;
    let manageCookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ apiClient, samlAuth }) => {
      ({ cookieHeader: readCookieHeader } = await samlAuth.asInteractiveUser(
        AGENTIC_INVESTIGATIONS_READ_ROLE
      ));
      ({ cookieHeader: manageCookieHeader } = await samlAuth.asInteractiveUser(
        AGENTIC_INVESTIGATIONS_MANAGE_ROLE
      ));

      // Seed: 2 critical, 1 high, 1 medium — all sharing the same impacted entity.
      const shared = (id: string, severity: '80-critical' | '60-high' | '40-medium') =>
        upsertInvestigation(apiClient, manageCookieHeader, {
          id,
          status: 'running',
          severity,
          impactedEntities: [{ name: testEntityName, nameText: testEntityName }],
        });

      await shared(uniqueId('sev-critical-1'), '80-critical');
      await shared(uniqueId('sev-critical-2'), '80-critical');
      await shared(uniqueId('sev-high-1'), '60-high');
      await shared(uniqueId('sev-medium-1'), '40-medium');
    });

    apiTest(
      'severityCounts reflect the count of investigations at each tier',
      async ({ apiClient }) => {
        const response = await listInvestigations(apiClient, readCookieHeader, {
          query: `impactedEntityName=${encodeURIComponent(testEntityName)}`,
        });
        expect(response).toHaveStatusCode(200);

        const { severityCounts } = response.body as { severityCounts: Record<string, number> };
        expect(severityCounts['80-critical']).toBeGreaterThanOrEqual(2);
        expect(severityCounts['60-high']).toBeGreaterThanOrEqual(1);
        expect(severityCounts['40-medium']).toBeGreaterThanOrEqual(1);
      }
    );

    apiTest(
      'severityCounts are stable when filtering items by a specific severity',
      async ({ apiClient }) => {
        // Without severity filter: record the baseline counts.
        const unfilteredResponse = await listInvestigations(apiClient, readCookieHeader, {
          query: `impactedEntityName=${encodeURIComponent(testEntityName)}`,
        });
        expect(unfilteredResponse).toHaveStatusCode(200);
        const unfilteredCounts = unfilteredResponse.body.severityCounts as Record<string, number>;

        // With severity=60-high filter: items are scoped but counts must remain the same.
        const filteredResponse = await listInvestigations(apiClient, readCookieHeader, {
          query: `severity=60-high&impactedEntityName=${encodeURIComponent(testEntityName)}`,
        });
        expect(filteredResponse).toHaveStatusCode(200);

        // Only the high-severity investigation should appear in items.
        const filteredIds = filteredResponse.body.items.map((r: { id: string }) => r.id);
        for (const item of filteredResponse.body.items as Array<{
          id: string;
          severity: string;
        }>) {
          expect(item.severity).toBe('60-high');
        }
        expect(filteredIds.length).toBeGreaterThanOrEqual(1);

        // But severityCounts must still show all tiers, matching the unfiltered baseline.
        const filteredCounts = filteredResponse.body.severityCounts as Record<string, number>;
        expect(filteredCounts['80-critical']).toBe(unfilteredCounts['80-critical']);
        expect(filteredCounts['60-high']).toBe(unfilteredCounts['60-high']);
        expect(filteredCounts['40-medium']).toBe(unfilteredCounts['40-medium']);
      }
    );

    apiTest(
      'severityCounts for tiers with no investigations are zero or absent',
      async ({ apiClient }) => {
        const response = await listInvestigations(apiClient, readCookieHeader, {
          query: `impactedEntityName=${encodeURIComponent(testEntityName)}`,
        });
        expect(response).toHaveStatusCode(200);

        const { severityCounts } = response.body as { severityCounts: Record<string, number> };
        // '20-low' was never seeded; it must be 0 or missing entirely.
        const lowCount = severityCounts['20-low'] ?? 0;
        expect(lowCount).toBe(0);
      }
    );
  }
);
