/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  EVALS_EXPERIMENTS_PREVIEW_URL,
  INTERNAL_API_ACCESS,
} from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { EVALS_API_PRIVILEGES } from '../../../common';
import {
  runExperimentRequestSchema,
  type PreviewExperimentResponse,
} from '../../../common/experiments/run_experiment';
import { experimentRequestToParams, generateSavedWorkflowYaml } from '../../workflow_generator';
import type { RouteDependencies } from '../register_routes';

/**
 * Returns the generated workflow YAML for the current form inputs without
 * executing or persisting anything. Powers the "Show YAML" preview and works
 * even when the Workflows plugin is unavailable, since it only stringifies the
 * inferred definition.
 */
export const registerPreviewExperimentRoute = ({ router }: RouteDependencies) => {
  router.versioned
    .post({
      path: EVALS_EXPERIMENTS_PREVIEW_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.read] },
      },
      summary: 'Preview the generated workflow YAML for an experiment',
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
        const body = request.body;
        if (body.agent_id && body.tool_id) {
          return response.badRequest({
            body: { message: 'Provide only one of agent_id or tool_id, not both.' },
          });
        }

        try {
          const { yaml } = generateSavedWorkflowYaml(experimentRequestToParams(body));
          const responseBody: PreviewExperimentResponse = { yaml };
          return response.ok({ body: responseBody });
        } catch (error) {
          return response.badRequest({
            body: { message: error instanceof Error ? error.message : String(error) },
          });
        }
      }
    );
};
