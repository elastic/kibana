/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDependencies } from '../types';
import { internalApiPath } from '../../../common/constants';
import { syncAgentBuilderOverviewDashboard } from '../../dashboard';
import { AGENT_BUILDER_READ_SECURITY } from '../route_security';

export function registerInternalSyncOverviewDashboardRoute({
  router,
  coreSetup,
  logger,
}: RouteDependencies) {
  router.post(
    {
      path: `${internalApiPath}/dashboard/_sync`,
      validate: {},
      options: { access: 'internal' },
      security: AGENT_BUILDER_READ_SECURITY,
    },
    async (_context, _request, response) => {
      const [coreStart] = await coreSetup.getStartServices();
      try {
        await syncAgentBuilderOverviewDashboard(coreStart, logger);
        return response.ok();
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: {
            message: `Failed to sync Agent Builder overview dashboard: ${(error as Error).message}`,
          },
        });
      }
    }
  );
}
