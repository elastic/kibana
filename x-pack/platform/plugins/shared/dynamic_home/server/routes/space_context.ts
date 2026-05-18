/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, StartServicesAccessor } from '@kbn/core/server';
import type { AlertingServerStart } from '@kbn/alerting-plugin/server';

interface StartDeps {
  alerting?: AlertingServerStart;
}

export interface SpaceContextResponse {
  recentDashboards: Array<{ id: string; title: string; updatedAt: string }>;
  recentSearches: Array<{ id: string; title: string; updatedAt: string }>;
  totalRules: number;
}

export const registerSpaceContextRoute = (
  router: IRouter,
  getStartServices: StartServicesAccessor<StartDeps>
) => {
  router.get(
    {
      path: '/internal/dynamic_home/space_context',
      validate: false,
      security: {
        authz: {
          enabled: false,
          reason:
            'Access is controlled via the scoped saved objects client; alerting client applies its own authz.',
        },
      },
    },
    async (ctx, req, res) => {
      const coreCtx = await ctx.core;
      const soClient = coreCtx.savedObjects.client;

      const [dashboardsResult, searchesResult] = await Promise.all([
        soClient.find<{ title: string }>({
          type: 'dashboard',
          sortField: 'updated_at',
          sortOrder: 'desc',
          perPage: 5,
          fields: ['title'],
        }),
        soClient.find<{ title: string }>({
          type: 'search',
          sortField: 'updated_at',
          sortOrder: 'desc',
          perPage: 5,
          fields: ['title'],
        }),
      ]);

      let totalRules = 0;
      try {
        const [, startDeps] = await getStartServices();
        if (startDeps.alerting) {
          const rulesClient = await startDeps.alerting.getRulesClientWithRequest(req);
          const rules = await rulesClient.find({ options: { perPage: 1 } });
          totalRules = rules.total;
        }
      } catch {
        // alerting unavailable or unauthorized — proceed without it
      }

      const body: SpaceContextResponse = {
        recentDashboards: dashboardsResult.saved_objects.map((d) => ({
          id: d.id,
          title: d.attributes.title ?? 'Untitled Dashboard',
          updatedAt: d.updated_at ?? new Date().toISOString(),
        })),
        recentSearches: searchesResult.saved_objects.map((s) => ({
          id: s.id,
          title: s.attributes.title ?? 'Untitled Search',
          updatedAt: s.updated_at ?? new Date().toISOString(),
        })),
        totalRules,
      };

      return res.ok({ body });
    }
  );
};
