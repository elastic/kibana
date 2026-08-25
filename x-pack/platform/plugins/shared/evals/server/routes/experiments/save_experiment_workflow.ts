/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  EVALS_EXPERIMENTS_SAVE_WORKFLOW_URL,
  INTERNAL_API_ACCESS,
} from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { EVALS_API_PRIVILEGES } from '../../../common';
import {
  isEvalsOwnedWorkflow,
  runExperimentRequestSchema,
  type SaveAsWorkflowResponse,
} from '../../../common/experiments/run_experiment';
import { experimentRequestToParams, generateSavedWorkflowYaml } from '../../workflow_generator';
import { findUnauthorizedTargetSpaces } from '../shared/authorize_target_spaces';
import type { RouteDependencies } from '../register_routes';

/** Saves a reusable experiment workflow that generates fresh IDs for each execution. */
export const registerSaveExperimentWorkflowRoute = ({
  router,
  logger,
  workflowsManagement,
  getSpaceId,
  checkManageEvalsPrivileges,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: EVALS_EXPERIMENTS_SAVE_WORKFLOW_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.manage] },
      },
      summary: 'Save an evaluation experiment as a reusable workflow',
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
              message: `All spaces ("${ALL_SPACES_ID}") is not a space id; name each space the experiment belongs to.`,
            },
          });
        }

        let workflow: ReturnType<typeof generateSavedWorkflowYaml>;
        try {
          workflow = generateSavedWorkflowYaml(experimentRequestToParams(body));
        } catch (error) {
          return response.badRequest({
            body: { message: error instanceof Error ? error.message : String(error) },
          });
        }

        const spaceId = getSpaceId ? await getSpaceId(request) : DEFAULT_SPACE_ID;

        // `requiredPrivileges` only authorizes the active space; baking any other target space
        // into the saved workflow is a cross-space write that must be authorized per space.
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

        try {
          let responseBody: SaveAsWorkflowResponse;
          if (body.workflow_id) {
            const existing = await workflowsManagement.management.getWorkflow(
              body.workflow_id,
              spaceId
            );
            if (!isEvalsOwnedWorkflow(existing)) {
              return response.notFound({
                body: { message: `Workflow not found: ${body.workflow_id}` },
              });
            }
            await workflowsManagement.management.updateWorkflow(
              body.workflow_id,
              { yaml: workflow.yaml },
              spaceId,
              request
            );
            responseBody = { workflow_id: body.workflow_id, name: workflow.name };
          } else {
            const created = await workflowsManagement.management.createWorkflow(
              { yaml: workflow.yaml },
              spaceId,
              request
            );
            responseBody = { workflow_id: created.id, name: created.name };
          }
          return response.ok({ body: responseBody });
        } catch (error) {
          logger.error(
            `Failed to save experiment workflow: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to save experiment workflow' },
          });
        }
      }
    );
};
