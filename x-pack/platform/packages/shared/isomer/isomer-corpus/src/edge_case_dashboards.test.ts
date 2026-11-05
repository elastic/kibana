/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lensApiConfigSchema } from '@kbn/lens-embeddable-utils';
import { asCodeIdSchema } from '@kbn/as-code-shared-schemas';
import { getDashboardDataSchema } from '@kbn/as-code-dashboard-schema';
import type { z } from '@kbn/zod';
import { EDGE_CASE_DASHBOARDS, toDashboardRequestBody } from './edge_case_dashboards';
import type { EdgeCase } from './edge_case_dashboards';

const ALL_EDGE_CASES: readonly EdgeCase[] = [
  'null',
  'negative',
  'huge',
  'tiny',
  'multivalue',
  'other_bucket',
  'missing_bucket',
  'long_titles',
];

const panelConfigs = EDGE_CASE_DASHBOARDS.flatMap(({ id: dashboardId, panels }) =>
  panels.map(({ id, config }) => ({ dashboardId, panelId: id, config }))
);

describe('edge-case dashboards', () => {
  it('cover every edge case in the corpus checklist', () => {
    const covered = new Set(EDGE_CASE_DASHBOARDS.flatMap(({ covers }) => covers));
    expect(ALL_EDGE_CASES.filter((edgeCase) => !covered.has(edgeCase))).toEqual([]);
  });

  it('use valid as-code dashboard IDs', () => {
    for (const { id } of EDGE_CASE_DASHBOARDS) {
      expect(asCodeIdSchema.safeParse(id).success).toBe(true);
    }
  });

  it('use unique panel IDs', () => {
    const ids = panelConfigs.map(({ panelId }) => panelId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(panelConfigs.map((entry) => [`${entry.dashboardId}/${entry.panelId}`, entry]))(
    '%s is a valid Lens API config',
    (_, { config }) => {
      const result = lensApiConfigSchema.safeParse(config);
      expect(result.error?.issues ?? []).toEqual([]);
    }
  );

  it.each(EDGE_CASE_DASHBOARDS.map((dashboard) => [dashboard.id, dashboard]))(
    '%s request body is valid dashboard state',
    (_, dashboard) => {
      const result = getDashboardDataSchema({
        vis: {
          schema: lensApiConfigSchema as z.ZodType<Record<string, unknown>>,
          title: 'Lens',
        },
      }).safeParse(toDashboardRequestBody(dashboard));
      expect(result.error?.issues ?? []).toEqual([]);
    }
  );
});
