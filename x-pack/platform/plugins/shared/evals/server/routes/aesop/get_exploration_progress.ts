/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/evals-common';
import type { AESOPRouteDependencies } from './register_aesop_routes';
import { WorkflowStateTracker } from '../../lib/aesop/workflows/workflow_state_tracker';

const getExplorationProgressParamsSchema = z.object({
  executionId: z.string().min(1),
});

/**
 * GET /internal/aesop/exploration/{executionId}/progress
 *
 * Returns real-time progress information for a running exploration workflow.
 *
 * Response includes:
 * - Current phase (1-5) and phase status
 * - Current step name
 * - Progress percentage
 * - Estimated time remaining
 * - Per-phase duration metrics
 *
 * Poll this endpoint every 2 seconds for live updates.
 */
export function registerGetExplorationProgressRoute({ router, logger }: AESOPRouteDependencies) {
  router.versioned
    .get({
      path: '/internal/aesop/exploration/{executionId}/progress',
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
          request: {
            params: buildRouteValidationWithZod(getExplorationProgressParamsSchema),
          },
        },
      },
      async (context, request, response) => {
        const { executionId } = request.params;

        try {
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;
          const tracker = new WorkflowStateTracker(esClient, logger);

          const state = await tracker.getExecutionState(executionId);

          if (!state) {
            return response.notFound({
              body: {
                message: `Exploration execution '${executionId}' not found. It may have been deleted or never existed.`,
              },
            });
          }

          logger.debug(
            `[AESOP] Fetched exploration progress execution_id=${executionId} progress=${state.progress_percentage} phase=${state.current_phase}`
          );

          return response.ok({
            body: state,
          });
        } catch (error) {
          logger.error(
            `[AESOP] Failed to fetch exploration progress execution_id=${executionId} error=${
              error instanceof Error ? error.message : String(error)
            }`
          );

          return response.customError({
            statusCode: 500,
            body: {
              message: `Failed to fetch exploration progress: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          });
        }
      }
    );
}
