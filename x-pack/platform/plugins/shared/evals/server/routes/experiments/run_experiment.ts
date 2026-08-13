/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS, EVALS_EXPERIMENTS_RUN_URL, INTERNAL_API_ACCESS } from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { EVALS_API_PRIVILEGES } from '../../../common';
import {
  runExperimentRequestSchema,
  type RunExperimentResponse,
} from '../../../common/experiments/run_experiment';
import { experimentRequestToParams, generateExperimentRun } from '../../workflow_generator';
import { findUnauthorizedTargetSpaces } from '../shared/authorize_target_spaces';
import type { RouteDependencies } from '../register_routes';

/** Launches inferred experiment workflows and returns execution IDs for polling. */
export const registerRunExperimentRoute = ({
  router,
  logger,
  workflowsManagement,
  getSpaceId,
  checkManageEvalsPrivileges,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: EVALS_EXPERIMENTS_RUN_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.manage] },
      },
      summary: 'Run an evaluation experiment as workflow execution(s)',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(runExperimentRequestSchema),
          },
        },
      },
      async (context, request, response) => {
        if (!workflowsManagement) {
          return response.customError({
            statusCode: 501,
            body: {
              message:
                'The Workflows plugin is not available; experiment execution is disabled in this deployment.',
            },
          });
        }

        const body = request.body;
        if (body.space_ids?.includes(ALL_SPACES_ID)) {
          return response.badRequest({
            body: {
              message: `Assigning an experiment to all spaces ("${ALL_SPACES_ID}") is not supported yet; provide explicit space ids.`,
            },
          });
        }

        let run: ReturnType<typeof generateExperimentRun>;
        try {
          run = generateExperimentRun(experimentRequestToParams(body));
        } catch (error) {
          return response.badRequest({
            body: { message: error instanceof Error ? error.message : String(error) },
          });
        }

        const spaceId = getSpaceId ? await getSpaceId(request) : DEFAULT_SPACE_ID;

        const unauthorizedSpaceIds = await findUnauthorizedTargetSpaces({
          request,
          requestedSpaceIds: body.space_ids,
          activeSpaceId: spaceId,
          checkManageEvalsPrivileges,
        });
        if (unauthorizedSpaceIds.length > 0) {
          return response.forbidden({
            body: {
              message: `Insufficient privileges to assign the experiment to space(s): ${unauthorizedSpaceIds.join(
                ', '
              )}.`,
            },
          });
        }

        const workflowExecutionIds: string[] = [];
        const launchedExecutions: RunExperimentResponse['executions'] = [];

        try {
          for (const execution of run.executions) {
            const result = await workflowsManagement.management.executeWorkflow({
              yaml: execution.yaml,
              ...(body.workflow_id ? { workflowId: body.workflow_id } : {}),
              request,
              spaceId,
              waitForCompletion: false,
              triggeredBy: 'evals-run-now',
              metadata: { execution_id: execution.executionId },
            });
            workflowExecutionIds.push(result.workflowExecutionId);
            launchedExecutions.push({
              execution_id: execution.executionId,
              connector_id: execution.connectorId,
              workflow_execution_id: result.workflowExecutionId,
            });
          }
        } catch (error) {
          logger.error(
            `Failed to launch experiment workflow execution(s): ${
              error instanceof Error ? error.message : String(error)
            }`
          );

          const cancellations = await Promise.allSettled(
            workflowExecutionIds.map((workflowExecutionId) =>
              workflowsManagement.management.cancelWorkflowExecution(
                workflowExecutionId,
                spaceId,
                request
              )
            )
          );

          // A cancellation that fails leaves a run consuming LLM quota that the client can
          // no longer see or stop, so log the ids an operator needs to clean up by hand.
          cancellations.forEach((cancellation, index) => {
            if (cancellation.status === 'rejected') {
              logger.error(
                `Failed to cancel orphaned experiment workflow execution ${
                  workflowExecutionIds[index]
                }: ${
                  cancellation.reason instanceof Error
                    ? cancellation.reason.message
                    : String(cancellation.reason)
                }`
              );
            }
          });

          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to launch experiment workflow execution(s)' },
          });
        }

        const responseBody: RunExperimentResponse = {
          execution_id: run.executionId,
          mode: run.mode,
          compare_by: run.compareBy,
          experiment_ids: run.experimentIds,
          workflow_execution_ids: workflowExecutionIds,
          executions: launchedExecutions,
        };

        return response.ok({ body: responseBody });
      }
    );
};
