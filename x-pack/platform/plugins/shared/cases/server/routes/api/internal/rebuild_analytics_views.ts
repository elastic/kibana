/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { REBUILD_ANALYTICS_VIEWS_API_TAG } from '../../../../common/constants';
import type { ViewSyncService } from '../../../cases_analytics/views';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';

export const REBUILD_ANALYTICS_VIEWS_INTERNAL_URL = '/internal/cases/_analytics/views/_rebuild';

export interface RebuildAnalyticsViewsResponse {
  /** True if the regenerate completed; false if no views path is active. */
  rebuilt: boolean;
  /** ISO timestamp of the latest successful regenerate. */
  lastRegenAt: string | null;
  /** Latest regenerate error, or null on success. */
  lastRegenError: string | null;
}

interface BuildArgs {
  getViewSyncService: () => ViewSyncService | null;
}

/**
 * POST /internal/cases/_analytics/views/_rebuild — forces an immediate
 * rediscovery of extended-field subkeys via _field_caps and a re-PUT of
 * all 9 views. Useful after creating new template fields and exercising
 * them with at least one case so the view picks up the new columns
 * without waiting for the next plugin start.
 *
 * Single-flight on the sync service side: concurrent calls join the same
 * in-flight regenerate. Returns when the regenerate has settled (so the
 * status fields in the response reflect this run).
 */
export const buildRebuildAnalyticsViewsRoute = ({ getViewSyncService }: BuildArgs) =>
  createCasesRoute({
    method: 'post',
    path: REBUILD_ANALYTICS_VIEWS_INTERNAL_URL,
    security: {
      authz: {
        requiredPrivileges: [REBUILD_ANALYTICS_VIEWS_API_TAG],
      },
    },
    routerOptions: {
      access: 'internal',
    },
    handler: async ({ response }) => {
      try {
        const viewSyncService = getViewSyncService();
        if (!viewSyncService) {
          /*
           * In indices mode the views path isn't running — there's
           * nothing to rebuild. Return 200 with rebuilt=false so the UI
           * can communicate clearly without treating this as an error.
           */
          const body: RebuildAnalyticsViewsResponse = {
            rebuilt: false,
            lastRegenAt: null,
            lastRegenError: null,
          };
          return response.ok({ body });
        }

        await viewSyncService.regenerateNow();
        const status = viewSyncService.getStatus();
        const body: RebuildAnalyticsViewsResponse = {
          rebuilt: status.lastRegenError === null,
          lastRegenAt: status.lastRegenAt?.toISOString() ?? null,
          lastRegenError: status.lastRegenError,
        };
        return response.ok({ body });
      } catch (error) {
        throw createCaseError({
          message: `Failed to rebuild cases analytics views: ${error}`,
          error,
        });
      }
    },
  });
