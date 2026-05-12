/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/evals-common';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { AESOPRouteDependencies } from './register_aesop_routes';
import { WorkflowStateTracker } from '../../lib/aesop/workflows/workflow_state_tracker';
import { ExplorationWorkflowExecutor } from '../../lib/aesop/workflows/exploration_workflow_executor';
import { PersistentRateLimiter } from '../../lib/aesop/security/persistent_rate_limiter';
import { APMInstrumentationService } from '../../lib/aesop/monitoring/apm_instrumentation';
import { discoverIndices } from '../../services/index_discovery';
import { inferAnalystRole, describeRole } from '../../services/analyst_role_inference';
import { calibrateSamplingStrategy } from '../../services/sampling_strategy';

type ActionsClient = Awaited<ReturnType<ActionsPluginStart['getActionsClientWithRequest']>>;

// Erased skill registry contract to avoid a circular dep on @kbn/agent-builder-plugin.
// TODO(AESOP-contract): replace with the real type from a shared contract package (tracked for PR B6).

type SkillRegistryLike = any;

const runExplorationBodySchema = z.object({
  include_sample_data: z.boolean().optional().default(true),
  connector_id: z.string().optional(),
});

export function registerRunExplorationRoute({
  router,
  logger,
  skillOnlineEvalService,
}: AESOPRouteDependencies) {
  router.versioned
    .post({
      path: '/internal/aesop/exploration/run',
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
            body: buildRouteValidationWithZod(runExplorationBodySchema),
          },
        },
      },
      async (context, request, response) => {
        try {
          // Rate limiting check — persistent across Kibana restarts
          const coreContext = await context.core;
          const internalClient = coreContext.elasticsearch.client.asInternalUser;
          const rateLimiter = new PersistentRateLimiter(internalClient, logger);

          // Key the rate limiter on the authenticated username so one user
          // exhausting their quota does not block other users. Falls back to
          // 'anonymous' only when security is disabled (dev / serverless
          // insecure mode), which we also log.
          const currentUser = coreContext.security.authc.getCurrentUser();
          const userId = currentUser?.username ?? 'anonymous';
          if (!currentUser) {
            logger.warn(
              '[AESOP] Running exploration without an authenticated user; rate-limiting under shared "anonymous" bucket'
            );
          }
          const rateLimit = await rateLimiter.checkRateLimit(userId, 'exploration');

          if (!rateLimit.allowed) {
            return response.customError({
              statusCode: 429,
              body: {
                message: `Rate limit exceeded. You can run 1 exploration per hour. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
              },
              headers: {
                'Retry-After': rateLimit.retryAfterSeconds!.toString(),
                'X-RateLimit-Limit': rateLimit.limit.toString(),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': new Date(rateLimit.resetAt!).toISOString(),
              },
            });
          }

          const evalsContext = await context.evals;
          const esClient = coreContext.elasticsearch.client;
          const { include_sample_data, connector_id: connectorId } = request.body;

          let actionsClient: ActionsClient | undefined;
          if (connectorId) {
            const actionsStart = evalsContext.getActionsStart();
            if (actionsStart) {
              actionsClient = await actionsStart.getActionsClientWithRequest(request);
            }
          }

          logger.info(
            `[AESOP] Starting autonomous exploration user_id=${userId} include_sample_data=${include_sample_data} rate_limit_remaining=${rateLimit.remaining}`
          );

          // Phase 1: Auto-discover available indices
          logger.info('[AESOP] Phase 1: Discovering available indices...');
          const indexCatalog = await discoverIndices(esClient, logger);

          if (indexCatalog.indices.length === 0) {
            logger.info(
              '[AESOP] No indices discovered — exploration will rely on conversation analysis only'
            );
          }

          // Phase 2: Infer analyst role from event log
          logger.info('[AESOP] Phase 2: Inferring analyst role...');
          const roleInference = await inferAnalystRole(esClient, logger, userId);
          logger.info(
            `[AESOP] Inferred role: ${describeRole(roleInference.role)} (confidence: ${(
              roleInference.confidence * 100
            ).toFixed(1)}%)`
          );

          // Phase 3: Calibrate sampling strategy
          logger.info('[AESOP] Phase 3: Calibrating sampling strategy...');
          const samplingConfig = await calibrateSamplingStrategy(
            esClient,
            logger,
            indexCatalog.indices
          );

          const topIndices = indexCatalog.indices.slice(0, 10).map((idx) => idx.name);

          logger.info(
            `[AESOP] Autonomous discovery complete discovered_indices=${indexCatalog.securityRelevantCount} analyst_role=${roleInference.role} sampling_strategy=${samplingConfig.strategyName}`
          );

          // Use the current user's client for index creation (kibana_system lacks
          // privileges to create custom .aesop-* indices, but the logged-in user does)
          const currentUserClient = esClient.asCurrentUser;

          // Initialize APM instrumentation
          const apmService = new APMInstrumentationService(currentUserClient, logger);
          await apmService.ensureMetricsIndex();

          // Generate execution ID and initialize state tracking
          const executionId = `aesop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const stateTracker = new WorkflowStateTracker(currentUserClient, logger);
          await stateTracker.initializeExecution(executionId, 'aesop.self_exploration');

          logger.info(
            `[AESOP] Exploration initialized execution_id=${executionId} user_id=${userId} discovered_indices=${topIndices.length} inferred_role=${roleInference.role} sampling_strategy=${samplingConfig.strategyName}`
          );

          // Record APM metric for exploration start
          await apmService.instrumentWorkflowStep(
            'exploration_started',
            {
              workflow_name: 'aesop.autonomous_exploration',
              analyst_role: roleInference.role,
              discovered_indices_count: indexCatalog.indices.length,
              top_indices: topIndices,
              sampling_strategy: samplingConfig.strategyName,
              user_id: userId,
            },
            async () => executionId
          );

          // Eagerly create skill registry while request is still active
          let skillRegistry: SkillRegistryLike | undefined;
          const agentBuilderStart = await evalsContext.getAgentBuilderStart();
          if (agentBuilderStart) {
            try {
              skillRegistry = await agentBuilderStart.skills.getRegistry({ request });
            } catch (err) {
              logger.warn(
                `[AESOP] Could not create skill registry error=${
                  err instanceof Error ? err.message : String(err)
                }`
              );
            }
          }

          // Fire-and-forget: run the 5-phase exploration asynchronously
          const executor = new ExplorationWorkflowExecutor(
            currentUserClient,
            logger,
            stateTracker,
            {
              executionId,
              userId,
              indices: indexCatalog.indices,
              analystRole: roleInference.role,
              roleDescription: describeRole(roleInference.role),
              samplingConfig,
              connectorId,
              actionsClient,
              getSkillRegistry: async () => skillRegistry,
              getAgentBuilderStart: () => agentBuilderStart,
              request,
              datasetService: evalsContext.datasetService,
              evaluatorRegistry: skillOnlineEvalService?.evaluatorRegistry,
            }
          );
          executor.execute().catch((err) => {
            logger.error(
              `[AESOP] Background exploration failed error=${
                err instanceof Error ? err.message : String(err)
              }`
            );
          });

          return response.ok({
            body: {
              success: true,
              execution_id: executionId,
              workflow_name: 'aesop.self_exploration',
              status: 'running',
              started_at: new Date().toISOString(),
              message: `Autonomous exploration started. Discovered ${
                indexCatalog.indices.length
              } indices, inferred role: ${describeRole(roleInference.role)}.`,
            },
          });
        } catch (error) {
          logger.error(
            `[AESOP] Failed to start exploration error=${
              error instanceof Error ? error.message : String(error)
            }`
          );

          return response.customError({
            statusCode: 500,
            body: {
              message: `Failed to start exploration: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          });
        }
      }
    );
}
