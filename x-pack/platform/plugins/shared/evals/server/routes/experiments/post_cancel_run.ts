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

const CancelExperimentRunParams = z.object({
  workflowExecutionId: z.string().min(1),
});

export const registerCancelExperimentRunRoute = ({
  router,
  logger,
  workflowsManagement,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: '/internal/evals/experiments/runs/{workflowExecutionId}/cancel',
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [PLUGIN_ID, WorkflowsManagementApiActions.cancelExecution],
        },
      },
      summary: 'Cancel an experiment run',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(CancelExperimentRunParams),
          },
        },
      },
      async (context, request, response) => {
        try {
          if (!workflowsManagement) {
            return response.customError({
              statusCode: 503,
              body: { message: 'workflowsManagement plugin is not available' },
            });
          }

          const { spaceId } = getSpaceIdFromPath(request.url.pathname);

          await workflowsManagement.management.cancelWorkflowExecution(
            request.params.workflowExecutionId,
            spaceId
          );

          return response.ok({
            body: { workflow_execution_id: request.params.workflowExecutionId },
          });
        } catch (error) {
          logger.error(`Failed to cancel experiment run: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to cancel experiment run' },
          });
        }
      }
    );
};
