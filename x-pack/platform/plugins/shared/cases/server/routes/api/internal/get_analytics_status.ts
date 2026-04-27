/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GET_ANALYTICS_STATUS_API_TAG } from '../../../../common/constants';
import type { AnalyticsMode, ViewSyncService } from '../../../cases_analytics/views';
import { CAI_VIEW_NAMES } from '../../../cases_analytics/views/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';

export const ANALYTICS_STATUS_INTERNAL_URL = '/internal/cases/_analytics/status';

export interface AnalyticsStatusResponse {
  /** Which analytics surface plugin start resolved to. */
  mode: AnalyticsMode;
  /**
   * The 9 cluster-state view names this plugin manages when in `views`
   * mode. Always returned (even in `indices` mode) so a UI consumer can
   * compose the same Discover URL regardless of the active surface.
   */
  viewNames: readonly string[];
  /** Last successful regenerate timestamp (ISO), or null if never. */
  lastRegenAt: string | null;
  /** Latest regenerate error message, or null. */
  lastRegenError: string | null;
  /** True while a regenerate is in flight. */
  regenInFlight: boolean;
}

interface BuildArgs {
  getAnalyticsMode: () => AnalyticsMode;
  getViewSyncService: () => ViewSyncService | null;
}

/**
 * GET /internal/cases/_analytics/status — exposes the analytics mode and
 * view-sync state for use by the cases configure UI and operators.
 *
 * Authorization: gated at the route level via `requiredPrivileges` set to
 * the read-tier API tag, which is bundled into both `read` and `all`
 * cases feature privileges.
 */
export const buildGetAnalyticsStatusRoute = ({
  getAnalyticsMode,
  getViewSyncService,
}: BuildArgs) =>
  createCasesRoute({
    method: 'get',
    path: ANALYTICS_STATUS_INTERNAL_URL,
    security: {
      authz: {
        requiredPrivileges: [GET_ANALYTICS_STATUS_API_TAG],
      },
    },
    routerOptions: {
      access: 'internal',
    },
    handler: async ({ response }) => {
      try {
        const mode = getAnalyticsMode();
        const status = getViewSyncService()?.getStatus();
        const body: AnalyticsStatusResponse = {
          mode,
          viewNames: CAI_VIEW_NAMES,
          lastRegenAt: status?.lastRegenAt?.toISOString() ?? null,
          lastRegenError: status?.lastRegenError ?? null,
          regenInFlight: status?.regenInFlight ?? false,
        };
        return response.ok({ body });
      } catch (error) {
        throw createCaseError({
          message: `Failed to read cases analytics status: ${error}`,
          error,
        });
      }
    },
  });
