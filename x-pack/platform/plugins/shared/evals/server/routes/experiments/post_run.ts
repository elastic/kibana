/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { API_VERSIONS, INTERNAL_API_ACCESS, buildRouteValidationWithZod } from '@kbn/evals-common';
import { getSpaceIdFromPath } from '@kbn/spaces-utils';
import type { WorkflowExecutionEngineModel } from '@kbn/workflows';
import { WorkflowsManagementApiActions } from '@kbn/workflows/common/privileges';
import { z } from '@kbn/zod';
import { PLUGIN_ID } from '../../../common';
import type { RouteDependencies } from '../register_routes';

const RunExperimentSuiteRequestBody = z.object({
  workflow_id: z.string().min(1),
  suite_id: z.string().min(1),
  task_connector_id: z.string().min(1),
  judge_connector_id: z.string().min(1),
  suite_params: z.record(z.string(), z.unknown()).optional(),
});

export const registerRunExperimentSuiteRoute = ({
  router,
  logger,
  experimentSuiteRegistry,
  workflowsManagement,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: '/internal/evals/experiments/runs',
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [PLUGIN_ID, WorkflowsManagementApiActions.execute],
        },
      },
      summary: 'Start an experiment run',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(RunExperimentSuiteRequestBody),
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

          if (!experimentSuiteRegistry) {
            return response.customError({
              statusCode: 500,
              body: { message: 'Experiment suite registry is not available' },
            });
          }

          const { workflow_id: workflowId, suite_id: suiteId } = request.body;
          const suite = experimentSuiteRegistry.getById(suiteId);
          if (!suite) {
            return response.notFound({
              body: { message: `Unknown suite_id: ${suiteId}` },
            });
          }

          const { spaceId } = getSpaceIdFromPath(request.url.pathname);

          const workflow = await workflowsManagement.management.getWorkflow(workflowId, spaceId);
          if (!workflow) {
            return response.notFound({
              body: { message: `Workflow not found: ${workflowId}` },
            });
          }
          if (!workflow.valid || !workflow.definition) {
            return response.badRequest({
              body: { message: 'Workflow is not valid or is missing a definition' },
            });
          }
          if (!workflow.enabled) {
            return response.badRequest({
              body: { message: 'Workflow is disabled' },
            });
          }

          const runId = randomUUID();
          const suiteParams = request.body.suite_params ?? {};

          const workflowForExecution: WorkflowExecutionEngineModel = {
            id: workflow.id,
            name: workflow.name,
            enabled: workflow.enabled,
            definition: workflow.definition,
            yaml: workflow.yaml,
          };

          const workflowExecutionId = await workflowsManagement.management.runWorkflow(
            workflowForExecution as WorkflowExecutionEngineModel,
            spaceId,
            {
              ...request.body,
              suite_params: suiteParams,
            },
            request,
            undefined,
            {
              run_id: runId,
              suite_id: suiteId,
              source: 'experiment',
            }
          );

          return response.ok({
            body: {
              run_id: runId,
              suite_id: suiteId,
              workflow_execution_id: workflowExecutionId,
            },
          });
        } catch (error) {
          logger.error(`Failed to start experiment run: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to start experiment run' },
          });
        }
      }
    );
};
