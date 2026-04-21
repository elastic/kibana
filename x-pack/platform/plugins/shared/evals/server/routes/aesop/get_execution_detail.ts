/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { AESOPRouteDependencies } from './register_aesop_routes';

interface ExecutionPhase {
  phase_name?: string;
  status?: string;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
}

interface ExecutionStateLike {
  workflow_name?: string;
  status?: string;
  started_at?: string;
  completed_at?: string;
  updated_at?: string;
  error_message?: string;
  config?: {
    agent_role?: string;
    scoped_indices?: string[];
    exploration_depth?: number;
    min_pattern_frequency?: number;
  };
  phases?: ExecutionPhase[];
  schemas_discovered?: unknown[];
  metrics?: {
    indices_explored?: number;
    relationships_discovered?: number;
    patterns_found?: number;
    skills_generated?: number;
    total_tokens?: number;
    total_cost_usd?: number;
  };
  trace_id?: string;
  [key: string]: unknown;
}

interface EsErrorLike {
  statusCode?: number;
  message?: string;
  meta?: { statusCode?: number };
}

interface ProposedSkillLike {
  skill_id?: string;
  name?: string;
  description?: string;
  confidence?: number;
  validation?: { status?: string };
}

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
export function registerGetExecutionDetailRoute({ router, logger }: AESOPRouteDependencies) {
  router.versioned
    .get({
      path: '/internal/aesop/exploration/executions/{executionId}',
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['evals'],
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
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;

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
          let proposedSkills: Array<Record<string, unknown>> = [];
          try {
            const skillsResult = await esClient.search<Record<string, unknown>>({
              index: '.aesop-proposed-skills',
              query: {
                term: {
                  'metadata.exploration_execution_id': executionId,
                },
              },
              size: 50,
            });
            proposedSkills = skillsResult.hits.hits
              .map((hit) => hit._source)
              .filter((src): src is Record<string, unknown> => !!src);
          } catch (error) {
            // Skills index may not exist yet - non-critical
            // Continue with empty skills array
          }

          // Fetch discovered relationships (if stored)
          let discoveredRelationships: Array<Record<string, unknown>> = [];
          try {
            const relationshipsResult = await esClient.search<Record<string, unknown>>({
              index: '.aesop-discovered-relationships',
              query: {
                term: {
                  exploration_execution_id: executionId,
                },
              },
              size: 100,
            });
            discoveredRelationships = relationshipsResult.hits.hits
              .map((hit) => hit._source)
              .filter((src): src is Record<string, unknown> => !!src);
          } catch (error) {
            // Relationships index may not exist - non-critical
          }

          // Fetch discovered patterns
          let discoveredPatterns: Array<Record<string, unknown>> = [];
          try {
            const patternsResult = await esClient.search<Record<string, unknown>>({
              index: '.aesop-discovered-patterns',
              query: {
                term: {
                  exploration_execution_id: executionId,
                },
              },
              size: 100,
            });
            discoveredPatterns = patternsResult.hits.hits
              .map((hit) => hit._source)
              .filter((src): src is Record<string, unknown> => !!src);
          } catch (error) {
            // Patterns index may not exist - non-critical
          }

          // TODO(AESOP-contract): replace with a proper WorkflowExecution type from the
          // aesop lib once it's stable. For now the erased shape below is the public
          // contract surface consumers see.
          const executionState = (workflowState._source ?? {}) as ExecutionStateLike;

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

            // Workflow trace — map phase_name → step_name for frontend
            workflow_steps: (executionState.phases ?? []).map((phase) => ({
              step_name: phase.phase_name,
              status: phase.status,
              started_at: phase.started_at,
              completed_at: phase.completed_at,
              duration_ms: phase.duration_ms,
            })),

            // Discoveries
            schemas_discovered: executionState.schemas_discovered || [],
            patterns_identified: discoveredPatterns,
            relationships_discovered: discoveredRelationships,

            // Generated skills
            skills_proposed: proposedSkills.map((raw) => {
              const skill = raw as ProposedSkillLike;
              return {
                id: skill.skill_id,
                name: skill.name,
                description: skill.description,
                confidence: skill.confidence,
                validation_status: skill.validation?.status ?? 'pending',
              };
            }),

            // Performance metrics
            metrics: {
              total_duration_ms:
                executionState.completed_at && executionState.started_at
                  ? new Date(executionState.completed_at).getTime() -
                    new Date(executionState.started_at).getTime()
                  : undefined,
              indices_explored:
                executionState.metrics?.indices_explored ||
                executionState.config?.scoped_indices?.length ||
                0,
              relationships_discovered:
                executionState.metrics?.relationships_discovered || discoveredRelationships.length,
              patterns_found: executionState.metrics?.patterns_found || discoveredPatterns.length,
              skills_generated: executionState.metrics?.skills_generated || proposedSkills.length,
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
          const err = error as EsErrorLike;
          if (err.statusCode === 404 || err.meta?.statusCode === 404) {
            return response.notFound({
              body: {
                message: `Exploration execution not found: ${request.params.executionId}`,
              },
            });
          }

          return response.customError({
            statusCode: err.statusCode ?? 500,
            body: {
              message: err.message ?? 'Failed to fetch execution detail',
            },
          });
        }
      }
    );
}
