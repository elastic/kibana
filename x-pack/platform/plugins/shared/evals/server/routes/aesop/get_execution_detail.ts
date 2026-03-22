/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import type { EvalsRequestHandlerContext } from '../../types';

/**
 * GET /internal/aesop/exploration/executions/{executionId}
 *
 * Returns detailed view of a single exploration workflow execution including:
 * - Workflow trace (steps, phases, status)
 * - Discovery results (schemas, patterns, relationships)
 * - Generated skills
 * - Performance metrics
 * - O11y trace ID
 */
export function registerGetExecutionDetailRoute(router: IRouter<EvalsRequestHandlerContext>) {
  router.versioned
    .get({
      path: '/internal/aesop/exploration/executions/{executionId}',
      access: 'internal',
      security: {
        authz: {
          enabled: false, // Internal route, RBAC deferred
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: schema.object({
              executionId: schema.string({
                minLength: 1,
                meta: { description: 'Unique workflow execution identifier' },
              }),
            }),
          },
        },
      },
      async (context, request, response) => {
        const startTime = Date.now();

        try {
          const { executionId } = request.params;
          const { asCurrentUser: esClient } = context.core.elasticsearch.client;

          // Fetch workflow execution state
          const workflowState = await esClient.get({
            index: '.aesop-workflow-executions',
            id: executionId,
          });

          if (!workflowState.found) {
            return response.notFound({
              body: {
                message: `Exploration execution not found: ${executionId}`,
              },
            });
          }

          // Fetch associated proposed skills (if any)
          let proposedSkills = [];
          try {
            const skillsResult = await esClient.search({
              index: '.aesop-proposed-skills',
              query: {
                term: {
                  'metadata.exploration_execution_id': executionId,
                },
              },
              size: 50,
            });
            proposedSkills = skillsResult.hits.hits.map((hit) => hit._source);
          } catch (error) {
            // Skills index may not exist yet - non-critical
            // Continue with empty skills array
          }

          // Fetch discovered relationships (if stored)
          let discoveredRelationships = [];
          try {
            const relationshipsResult = await esClient.search({
              index: '.aesop-discovered-relationships',
              query: {
                term: {
                  exploration_execution_id: executionId,
                },
              },
              size: 100,
            });
            discoveredRelationships = relationshipsResult.hits.hits.map((hit) => hit._source);
          } catch (error) {
            // Relationships index may not exist - non-critical
          }

          // Fetch discovered patterns
          let discoveredPatterns = [];
          try {
            const patternsResult = await esClient.search({
              index: '.aesop-discovered-patterns',
              query: {
                term: {
                  exploration_execution_id: executionId,
                },
              },
              size: 100,
            });
            discoveredPatterns = patternsResult.hits.hits.map((hit) => hit._source);
          } catch (error) {
            // Patterns index may not exist - non-critical
          }

          const executionState = workflowState._source as any;

          // Build comprehensive execution detail response
          const executionDetail = {
            execution_id: executionId,
            workflow_name: executionState.workflow_name,
            status: executionState.status,
            started_at: executionState.started_at,
            completed_at: executionState.completed_at,
            updated_at: executionState.updated_at,
            error_message: executionState.error_message,

            // Configuration
            agent_role: executionState.config?.agent_role || 'SOC analyst',
            scoped_indices: executionState.config?.scoped_indices || [],
            exploration_depth: executionState.config?.exploration_depth || 100,
            min_pattern_frequency: executionState.config?.min_pattern_frequency || 10,

            // Workflow trace
            workflow_steps: executionState.phases || [],

            // Discoveries (from separate indices)
            schemas_discovered: [], // TODO: Parse from workflow output or separate index
            patterns_identified: discoveredPatterns,
            relationships_discovered: discoveredRelationships,

            // Generated skills
            skills_proposed: proposedSkills.map((skill: any) => ({
              id: skill.skill_id,
              name: skill.name,
              description: skill.description,
              confidence: skill.confidence,
              validation_status: skill.validation?.status || 'pending',
            })),

            // Performance metrics
            metrics: {
              total_duration_ms: executionState.completed_at
                ? new Date(executionState.completed_at).getTime() -
                  new Date(executionState.started_at).getTime()
                : undefined,
              indices_explored: executionState.config?.scoped_indices?.length || 0,
              relationships_discovered: discoveredRelationships.length,
              patterns_found: discoveredPatterns.length,
              skills_generated: proposedSkills.length,
              total_tokens_used: executionState.metrics?.total_tokens,
              total_cost_usd: executionState.metrics?.total_cost_usd,
            },

            // O11y trace ID (for TraceWaterfall integration)
            trace_id: executionState.trace_id,
          };

          const duration = Date.now() - startTime;

          return response.ok({
            body: executionDetail,
            headers: {
              'x-response-time': `${duration}ms`,
            },
          });
        } catch (error) {
          if (error.statusCode === 404 || error.meta?.statusCode === 404) {
            return response.notFound({
              body: {
                message: `Exploration execution not found: ${request.params.executionId}`,
              },
            });
          }

          return response.customError({
            statusCode: error.statusCode || 500,
            body: {
              message: error.message || 'Failed to fetch execution detail',
            },
          });
        }
      }
    );
}
