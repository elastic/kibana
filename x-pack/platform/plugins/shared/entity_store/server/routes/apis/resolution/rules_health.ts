/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../../common';
import { RESOLUTION_ENTITY_STORE_PERMISSIONS } from '../../constants';
import type { EntityStorePluginRouter, EntityStoreRequestHandlerContext } from '../../../types';
import { wrapMiddlewares } from '../../middleware';
import { enterpriseLicenseMiddleware } from '../../middleware/enterprise_license';
import { summarizeRulesHealth } from '../../../domain/resolution/rules';
import { countRecentFailedRuns } from '../../../domain/resolution/rules/check/recent_failed_runs';
import { getResolutionRuleMonitoringDashboardId } from '../../../domain/asset_manager/resolution_runs_dashboard';
import { ensureResolutionRuleMonitoringDashboard } from '../../../domain/asset_manager/install_resolution_dashboard';
import { MAINTAINER_ID } from '../../../domain/resolution/rules/maintainers/automated_resolution';
import type { AutomatedResolutionState } from '../../../domain/resolution/rules/maintainers/automated_resolution/types';

const toAutomatedResolutionState = (state: unknown): AutomatedResolutionState | null => {
  if (typeof state !== 'object' || state === null || !('rules' in state)) {
    return null;
  }
  const { rules } = state;
  return typeof rules === 'object' && rules !== null ? (state as AutomatedResolutionState) : null;
};

export async function handleResolutionRulesHealth(
  ctx: EntityStoreRequestHandlerContext,
  _req: KibanaRequest,
  res: KibanaResponseFactory
): Promise<IKibanaResponse> {
  const { core, logger, namespace, entityMaintainersClient, entityResolutionRuleClient } =
    await ctx.entityStore;

  const [rules, maintainers] = await Promise.all([
    entityResolutionRuleClient.getEffectiveRules(),
    entityMaintainersClient.getMaintainers([MAINTAINER_ID]),
  ]);
  const maintainerState = toAutomatedResolutionState(maintainers[0]?.taskSnapshot?.state);

  const failedRuns24h = await countRecentFailedRuns({
    esClient: core.elasticsearch.client.asCurrentUser,
    namespace,
    logger,
  });

  // Installs the monitoring dashboard the first time anyone opens the tab in a space that lacks it,
  // so environments that existed before the dashboard still get it.
  const dashboardInstalled = await ensureResolutionRuleMonitoringDashboard({
    savedObjectsClient: core.savedObjects.client,
    savedObjectsImporter: core.savedObjects.getImporter(core.savedObjects.client),
    spaceId: namespace,
    logger,
  });

  return res.ok({
    body: {
      ...summarizeRulesHealth(rules, maintainerState),
      failed_runs_24h: failedRuns24h,
      dashboard_id: getResolutionRuleMonitoringDashboardId(namespace),
      dashboard_installed: dashboardInstalled,
    },
  });
}

/**
 * PROTOTYPE, internal only. Says, per resolution rule, whether it is off, failing (with the saved
 * error and next retry), healthy (with its last run counts) or has not run yet. Read-only.
 */
export function registerResolutionRulesHealth(router: EntityStorePluginRouter) {
  router.versioned
    .get({
      path: ENTITY_STORE_ROUTES.internal.RESOLUTION_RULES_HEALTH,
      access: 'internal',
      summary: 'Check the health of the resolution rules',
      security: { authz: RESOLUTION_ENTITY_STORE_PERMISSIONS },
      enableQueryVersion: true,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v2,
        validate: false,
      },
      wrapMiddlewares(handleResolutionRulesHealth, [enterpriseLicenseMiddleware])
    );
}
