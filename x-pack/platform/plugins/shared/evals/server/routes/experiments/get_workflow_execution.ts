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

const GetExperimentRunParams = z.object({
  workflowExecutionId: z.string().min(1),
});

export const registerGetExperimentRunRoute = ({
  router,
  logger,
  workflowsManagement,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: '/internal/evals/experiments/runs/{workflowExecutionId}',
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [PLUGIN_ID, WorkflowsManagementApiActions.readExecution],
        },
      },
      summary: 'Get an experiment run (workflow execution)',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetExperimentRunParams),
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
          const execution = await workflowsManagement.management.getWorkflowExecution(
            request.params.workflowExecutionId,
            spaceId,
            { includeInput: true, includeOutput: true }
          );

          if (!execution) {
            return response.notFound({
              body: {
                message: `Workflow execution not found: ${request.params.workflowExecutionId}`,
              },
            });
          }

          return response.ok({ body: { execution } });
        } catch (error) {
          logger.error(`Failed to get experiment run: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get experiment run' },
          });
        }
      }
    );
};
