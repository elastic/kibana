/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS, INTERNAL_API_ACCESS, buildRouteValidationWithZod } from '@kbn/evals-common';
import { getSpaceIdFromPath } from '@kbn/spaces-utils';
import { WorkflowsManagementApiActions } from '@kbn/workflows/common/privileges';
import { z } from '@kbn/zod';
import { PLUGIN_ID } from '../../../common';
import type { RouteDependencies } from '../register_routes';

const GetExperimentRunLogsParams = z.object({
  workflowExecutionId: z.string().min(1),
});

const GetExperimentRunLogsQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  size: z.coerce.number().int().min(1).max(200).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
});

export const registerGetExperimentRunLogsRoute = ({
  router,
  logger,
  workflowsManagement,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: '/internal/evals/experiments/runs/{workflowExecutionId}/logs',
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [PLUGIN_ID, WorkflowsManagementApiActions.readExecution],
        },
      },
      summary: 'Get logs for an experiment run (workflow execution)',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetExperimentRunLogsParams),
            query: buildRouteValidationWithZod(GetExperimentRunLogsQuery),
          },
        },
      },
      async (_context, request, response) => {
        try {
          if (!workflowsManagement) {
            return response.customError({
              statusCode: 503,
              body: { message: 'workflowsManagement plugin is not available' },
            });
          }

          const { spaceId } = getSpaceIdFromPath(request.url.pathname);
          const page = request.query.page ?? 1;
          const size = request.query.size ?? 50;
          const sortOrder = request.query.sort_order ?? 'desc';

          const logs = await workflowsManagement.management.getWorkflowExecutionLogs({
            executionId: request.params.workflowExecutionId,
            spaceId,
            size,
            page,
            sortOrder,
            sortField: '@timestamp',
          });

          return response.ok({ body: logs });
        } catch (error) {
          logger.error(`Failed to get experiment run logs: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get experiment run logs' },
          });
        }
      }
    );
};
