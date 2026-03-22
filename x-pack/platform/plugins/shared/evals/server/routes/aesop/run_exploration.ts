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

const runExplorationBodySchema = z.object({
  agent_role: z.string().default('SOC analyst'),
  scoped_indices: z.array(z.string()).default([
    '.alerts-security.alerts-*',
    '.siem-signals-*',
    'logs-endpoint.*',
  ]),
  exploration_depth: z.number().int().min(10).max(1000).default(100),
  min_pattern_frequency: z.number().int().min(1).max(100).default(10),
});

const runExplorationResponseSchema = z.object({
  success: z.boolean(),
  execution_id: z.string(),
  workflow_name: z.string(),
  status: z.enum(['running', 'completed', 'failed']),
  started_at: z.string(),
  message: z.string().optional(),
});

export function registerRunExplorationRoute(router: IRouter<EvalsRequestHandlerContext>) {
  router.versioned
    .post({
      path: '/internal/aesop/exploration/run',
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['evals'],  // Requires evals privilege
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
            body: buildRouteValidationWithZod(runExplorationBodySchema),
          },
          response: {
            200: {
              body: () => runExplorationResponseSchema,
            },
          },
        },
      },
      async (context, request, response) => {
        const { workflowsManagement } = context;

        if (!workflowsManagement) {
          return response.badRequest({
            body: {
              message: 'Workflows Management plugin not available. Ensure xpack.workflows.enabled: true in kibana.yml',
            },
          });
        }

        try {
          const { agent_role, scoped_indices, exploration_depth, min_pattern_frequency } = request.body;

          context.logger.info('[AESOP] Starting self-exploration workflow', {
            agent_role,
            scoped_indices,
            exploration_depth,
          });

          // Execute the self-exploration workflow
          const workflowApi = workflowsManagement.management;
          const executionId = await workflowApi.runWorkflow(
            {
              id: 'aesop.self_exploration',
              name: 'AESOP Self-Exploration',
              enabled: true,
              definition: {}, // Definition loaded from YAML
              yaml: '', // Loaded from file
            },
            'default',  // spaceId
            {
              agent_role,
              scoped_indices,
              exploration_depth,
              min_pattern_frequency,
            },
            request,
            undefined,  // cancellationToken
            {
              // metadata
              triggered_by: 'aesop_ui',
              agent_role,
            }
          );

          context.logger.info('[AESOP] Workflow started', { execution_id: executionId });

          // Initialize workflow state tracking for progress updates
          const esClient = context.core.elasticsearch.client.asCurrentUser;
          const stateTracker = new WorkflowStateTracker(esClient, context.logger);

          await stateTracker.initializeExecution(executionId, 'aesop.self_exploration');
          context.logger.debug('[AESOP] Workflow state tracking initialized', { execution_id: executionId });

          return response.ok({
            body: {
              success: true,
              execution_id: executionId,
              workflow_name: 'aesop.self_exploration',
              status: 'running',
              started_at: new Date().toISOString(),
              message: `Self-exploration started. Execution ID: ${executionId}`,
            },
          });
        } catch (error) {
          context.logger.error('[AESOP] Failed to start exploration', { error });

          return response.customError({
            statusCode: 500,
            body: {
              message: `Failed to start exploration: ${error.message}`,
            },
          });
        }
      }
    );
}
