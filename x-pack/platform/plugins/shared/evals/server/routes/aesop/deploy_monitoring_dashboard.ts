/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { IRouter } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/evals-common';
import type { EvalsRequestHandlerContext } from '../../types';
import { DashboardGeneratorService } from '../../lib/aesop/monitoring/dashboard_generator';

const deployDashboardResponseSchema = z.object({
  success: z.boolean(),
  dashboard_id: z.string(),
  url: z.string(),
  message: z.string().optional(),
});

/**
 * POST /internal/aesop/monitoring/dashboard/deploy
 *
 * Deploys (or updates) the AESOP Performance Monitoring Dashboard
 *
 * Response:
 * - dashboard_id: ID of created/updated dashboard
 * - url: Direct link to dashboard in Kibana
 */
export function registerDeployMonitoringDashboardRoute(
  router: IRouter<EvalsRequestHandlerContext>
) {
  router.versioned
    .post({
      path: '/internal/aesop/monitoring/dashboard/deploy',
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['evals'],
        },
      },
      options: {
        tags: ['access:evals'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {},
          response: {
            200: {
              body: () => deployDashboardResponseSchema,
            },
          },
        },
      },
      async (context, request, response) => {
        const ctx = await context.resolve(['core', 'evals']);

        try {
          ctx.logger.info('[AESOP] Deploying performance monitoring dashboard');

          const dashboardGenerator = new DashboardGeneratorService(
            ctx.core.savedObjects.client,
            ctx.logger
          );

          const dashboardId = await dashboardGenerator.createPerformanceMonitoringDashboard();

          const dashboardUrl = `/app/dashboards#/view/${dashboardId}`;

          ctx.logger.info('[AESOP] ✅ Dashboard deployed successfully', {
            dashboard_id: dashboardId,
            url: dashboardUrl,
          });

          return response.ok({
            body: {
              success: true,
              dashboard_id: dashboardId,
              url: dashboardUrl,
              message: `Dashboard deployed successfully. Visit ${dashboardUrl} to view metrics.`,
            },
          });
        } catch (error) {
          ctx.logger.error('[AESOP] ❌ Failed to deploy monitoring dashboard', { error });

          return response.customError({
            statusCode: 500,
            body: {
              message: `Failed to deploy dashboard: ${error instanceof Error ? error.message : String(error)}`,
            },
          });
        }
      }
    );
}
