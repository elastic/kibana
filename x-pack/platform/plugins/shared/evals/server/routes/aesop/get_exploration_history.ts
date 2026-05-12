/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AESOPRouteDependencies } from './register_aesop_routes';

const WORKFLOW_EXECUTIONS_INDEX = '.aesop-workflow-executions';

interface WorkflowExecutionSource {
  workflow_name?: string;
  status?: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  config?: {
    agent_role?: string;
    scoped_indices?: string[];
  };
  metrics?: {
    indices_explored?: number;
    relationships_discovered?: number;
    patterns_found?: number;
    skills_generated?: number;
  };
}

interface EsIndexNotFoundError {
  meta?: { body?: { error?: { type?: string } } };
}

export function registerGetExplorationHistoryRoute({ router, logger }: AESOPRouteDependencies) {
  router.versioned
    .get({
      path: '/internal/aesop/exploration/history',
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
        validate: false,
      },
      async (context, request, response) => {
        try {
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;
          const limit = Math.min(
            Math.max(Number((request.query as { limit?: string }).limit) || 20, 1),
            100
          );

          let explorations: Array<Record<string, unknown>> = [];

          try {
            const result = await esClient.search({
              index: WORKFLOW_EXECUTIONS_INDEX,
              size: limit,
              sort: [{ started_at: { order: 'desc' } }],
              query: { match_all: {} },
            });

            explorations = result.hits.hits.map((hit) => {
              const source = (hit._source ?? {}) as WorkflowExecutionSource;
              return {
                execution_id: hit._id,
                workflow_name: source.workflow_name,
                status: source.status,
                started_at: source.started_at,
                completed_at: source.completed_at,
                error_message: source.error_message,
                agent_role: source.config?.agent_role ?? 'unknown',
                indices_discovered:
                  source.metrics?.indices_explored ?? source.config?.scoped_indices?.length ?? 0,
                scoped_indices: source.config?.scoped_indices ?? [],
                relationships_found: source.metrics?.relationships_discovered ?? 0,
                patterns_identified: source.metrics?.patterns_found ?? 0,
                skills_proposed: source.metrics?.skills_generated ?? 0,
              };
            });
          } catch (error) {
            const esError = error as EsIndexNotFoundError | undefined;
            if (esError?.meta?.body?.error?.type === 'index_not_found_exception') {
              logger.debug(
                `[AESOP] Index ${WORKFLOW_EXECUTIONS_INDEX} not found - returning empty history`
              );
            } else {
              throw error;
            }
          }

          return response.ok({
            body: { explorations },
          });
        } catch (error) {
          logger.error('[AESOP] Failed to fetch exploration history', { error });

          return response.customError({
            statusCode: 500,
            body: {
              message: `Failed to fetch exploration history: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          });
        }
      }
    );
}
