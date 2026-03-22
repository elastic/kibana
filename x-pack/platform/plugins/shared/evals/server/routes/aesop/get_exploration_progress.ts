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
import { WorkflowStateTracker } from '../../lib/aesop/workflows/workflow_state_tracker';

const getExplorationProgressParamsSchema = z.object({
  executionId: z.string().min(1),
});

const explorationProgressResponseSchema = z.object({
  execution_id: z.string(),
  workflow_name: z.string(),
  status: z.enum(['running', 'completed', 'failed']),
  current_phase: z.number().int().min(1).max(5),
  current_step: z.string(),
  total_steps: z.number().int(),
  completed_steps: z.number().int(),
  progress_percentage: z.number().int().min(0).max(100),
  estimated_time_remaining_ms: z.number(),
  started_at: z.string(),
  updated_at: z.string(),
  completed_at: z.string().optional(),
  error_message: z.string().optional(),
  phases: z.array(
    z.object({
      phase_number: z.number().int(),
      phase_name: z.string(),
      status: z.enum(['pending', 'running', 'completed', 'failed']),
      duration_ms: z.number().optional(),
      started_at: z.string().optional(),
      completed_at: z.string().optional(),
    })
  ),
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
export function registerGetExplorationProgressRoute(router: IRouter<EvalsRequestHandlerContext>) {
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
          response: {
            200: {
              body: () => explorationProgressResponseSchema,
            },
          },
        },
      },
      async (context, request, response) => {
        const { executionId } = request.params;

        try {
          const esClient = context.core.elasticsearch.client.asCurrentUser;
          const tracker = new WorkflowStateTracker(esClient, context.logger);

          const state = await tracker.getExecutionState(executionId);

          if (!state) {
            return response.notFound({
              body: {
                message: `Exploration execution '${executionId}' not found. It may have been deleted or never existed.`,
              },
            });
          }

          context.logger.debug('[AESOP] Fetched exploration progress', {
            execution_id: executionId,
            progress: state.progress_percentage,
            phase: state.current_phase,
          });

          return response.ok({
            body: state,
          });
        } catch (error) {
          context.logger.error('[AESOP] Failed to fetch exploration progress', {
            execution_id: executionId,
            error,
          });

          return response.customError({
            statusCode: 500,
            body: {
              message: `Failed to fetch exploration progress: ${error.message}`,
            },
          });
        }
      }
    );
}
