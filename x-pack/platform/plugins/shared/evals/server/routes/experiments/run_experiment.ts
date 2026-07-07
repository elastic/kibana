/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS, EVALS_EXPERIMENTS_RUN_URL, INTERNAL_API_ACCESS } from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { EVALS_API_PRIVILEGES } from '../../../common';
import {
  runExperimentRequestSchema,
  type RunExperimentResponse,
} from '../../../common/experiments/run_experiment';
import { experimentRequestToParams, generateExperimentRun } from '../../workflow_generator';
import type { RouteDependencies } from '../register_routes';

/**
 * Launches an experiment as one or more workflow executions ("Run now").
 *
 * The route generates self-contained workflow YAML from the form (inferring the
 * fan-out topology) and starts each execution via the workflows management API
 * without waiting for completion. Progress is polled separately from the
 * resulting workflow execution ids.
 */
export const registerRunExperimentRoute = ({
  router,
  logger,
  workflowsManagement,
  getSpaceId,
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
        if (body.agent_id && body.tool_id) {
          return response.badRequest({
            body: { message: 'Provide only one of agent_id or tool_id, not both.' },
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
        const workflowExecutionIds: string[] = [];
        const launchedExecutions: RunExperimentResponse['executions'] = [];

        try {
          for (const execution of run.executions) {
            const result = await workflowsManagement.management.executeWorkflow({
              yaml: execution.yaml,
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
