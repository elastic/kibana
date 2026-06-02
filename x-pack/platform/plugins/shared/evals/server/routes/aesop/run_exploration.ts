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
import { withAesopSpan } from '../../lib/aesop/monitoring/tracing';
import { discoverIndices, type IndexInfo } from '../../services/index_discovery';
import {
  inferAnalystRole,
  describeRole,
  type AnalystRole,
} from '../../services/analyst_role_inference';
import { calibrateSamplingStrategy } from '../../services/sampling_strategy';

type ActionsClient = Awaited<ReturnType<ActionsPluginStart['getActionsClientWithRequest']>>;

// Erased skill registry contract to avoid a circular dep on @kbn/agent-builder-plugin.
// TODO(AESOP-contract): replace with the real type from a shared contract package (tracked for PR B6).

type SkillRegistryLike = any;

/**
 * Body schema for `POST /internal/aesop/exploration/run`.
 *
 * The dashboard form sends `agent_role`, `mode`, `scoped_indices`,
 * `exploration_depth`, and `min_pattern_frequency`. They all default to
 * sensible values on the client, but the server must accept them so the
 * request validates and the operator can audit which configuration was
 * actually applied.
 */
const runExplorationBodySchema = z.object({
  include_sample_data: z.boolean().optional().default(true),
  connector_id: z.string().optional(),
  // Free-form description from the UI ("SOC analyst", "Threat Hunter", etc).
  // When provided we map it to one of the canonical AnalystRole values and
  // skip the event-log inference step. Empty / unrecognised values fall
  // through to inference.
  agent_role: z.string().optional(),
  // 'full' explores the entire data set; 'incremental' only the delta since
  // the last run. The UI auto-picks based on prior state. We forward the
  // mode to the executor and store it on the execution document so the
  // detail view can display "Mode: incremental".
  mode: z.enum(['full', 'incremental']).optional(),
  // Restrict discovery to a subset of index patterns. Wildcards (`*`) are
  // honoured so the UI can pass `.alerts-security.alerts-*`.
  scoped_indices: z.array(z.string()).optional(),
  // Advisory caps surfaced by the UI; the executor reads them from the
  // execution document and treats them as hints. Logged so an operator can
  // verify the request actually carried what the UI intended.
  exploration_depth: z.number().int().positive().optional(),
  min_pattern_frequency: z.number().int().positive().optional(),
});

/**
 * Maps the UI's free-form role string onto the canonical `AnalystRole`.
 * Returns `undefined` when the input does not look like any known role,
 * so the caller can fall through to event-log inference.
 */
const mapAnalystRole = (input: string | undefined): AnalystRole | undefined => {
  if (!input) return undefined;
  const normalized = input.toLowerCase().replace(/[\s-]+/g, '_');
  const known: AnalystRole[] = [
    'soc_analyst',
    'threat_hunter',
    'security_engineer',
    'ops_analyst',
    'unknown',
  ];
  if (known.includes(normalized as AnalystRole)) {
    return normalized as AnalystRole;
  }
  if (normalized.includes('soc')) return 'soc_analyst';
  if (normalized.includes('threat') || normalized.includes('hunter')) return 'threat_hunter';
  if (normalized.includes('engineer') || normalized.includes('detection')) {
    return 'security_engineer';
  }
  if (normalized.includes('ops') || normalized.includes('operations')) return 'ops_analyst';
  return undefined;
};

/**
 * Filters a discovered index catalog down to entries matching at least one
 * of the requested patterns. Each pattern is converted to a regex so simple
 * wildcards like `.alerts-security.alerts-*` work; non-pattern entries match
 * exactly. Returns the original catalog when no patterns are supplied.
 */
const filterIndicesByPatterns = (indices: IndexInfo[], patterns: string[]): IndexInfo[] => {
  if (patterns.length === 0) return indices;
  const matchers = patterns
    .map((pattern) => pattern.trim())
    .filter((pattern) => pattern.length > 0)
    .map((pattern) => {
      const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      return new RegExp(`^${escaped}$`);
    });
  if (matchers.length === 0) return indices;
  return indices.filter((idx) => matchers.some((re) => re.test(idx.name)));
};

export function registerRunExplorationRoute({
  router,
  logger,
  skillOnlineEvalService,
  rateLimits,
  explorationTimeoutMs,
  pluginStopSignal,
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
          const rateLimiter = new PersistentRateLimiter(internalClient, logger, rateLimits);

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
          const {
            include_sample_data,
            connector_id: connectorId,
            agent_role: agentRoleOverride,
            mode: explorationMode,
            scoped_indices: scopedIndices,
            exploration_depth: explorationDepth,
            min_pattern_frequency: minPatternFrequency,
          } = request.body;

          let actionsClient: ActionsClient | undefined;
          if (connectorId) {
            const actionsStart = evalsContext.getActionsStart();
            if (actionsStart) {
              actionsClient = await actionsStart.getActionsClientWithRequest(request);
            }
          } else {
            // Skill synthesis requires an LLM connector. Without one, the run
            // still completes (schema/pattern phases work) but no skills are
            // proposed. Surface this loudly so the caller can see it in the
            // logs and either pass `connector_id` or accept a stats-only run.
            logger.warn(
              `[AESOP] No connector_id supplied — Phase 5 (Skill Synthesis) will be skipped. ` +
                `Pass connector_id in the request body or run from the AESOP UI which always provides one.`
            );
          }

          logger.info(
            `[AESOP] Starting autonomous exploration user_id=${userId} include_sample_data=${include_sample_data} rate_limit_remaining=${rateLimit.remaining}` +
              (explorationMode ? ` mode=${explorationMode}` : '') +
              (typeof explorationDepth === 'number'
                ? ` exploration_depth=${explorationDepth}`
                : '') +
              (typeof minPatternFrequency === 'number'
                ? ` min_pattern_frequency=${minPatternFrequency}`
                : '')
          );

          // Phase 1: Auto-discover available indices
          logger.info('[AESOP] Phase 1: Discovering available indices...');
          const discoveredCatalog = await discoverIndices(esClient, logger);

          // Apply UI-provided index scoping when present. We narrow against
          // the auto-discovered catalog rather than using `scoped_indices`
          // verbatim so we still get the metadata (`type`, `securityRelevant`,
          // …) that downstream phases rely on.
          const requestedScopedIndices = (scopedIndices ?? []).filter(
            (pattern) => pattern.trim().length > 0
          );
          const filteredIndices =
            requestedScopedIndices.length > 0
              ? filterIndicesByPatterns(discoveredCatalog.indices, requestedScopedIndices)
              : discoveredCatalog.indices;

          if (requestedScopedIndices.length > 0) {
            logger.info(
              `[AESOP] Scoped indices supplied — narrowing exploration to ${
                filteredIndices.length
              }/${discoveredCatalog.indices.length} indices patterns=${requestedScopedIndices.join(
                ','
              )}`
            );
            if (filteredIndices.length === 0) {
              logger.warn(
                `[AESOP] Scoped index patterns matched zero discovered indices; exploration will fall back to conversation-only analysis. patterns=${requestedScopedIndices.join(
                  ','
                )}`
              );
            }
          }

          const indexCatalog = {
            ...discoveredCatalog,
            indices: filteredIndices,
            securityRelevantCount: filteredIndices.filter((idx) => idx.relevanceScore > 50).length,
          };

          if (indexCatalog.indices.length === 0) {
            logger.info(
              '[AESOP] No indices discovered — exploration will rely on conversation analysis only'
            );
          }

          // Phase 2: Resolve analyst role.
          // Honour the UI-provided role when it maps to a known value; fall
          // back to event-log inference otherwise. The override path skips
          // the ES query entirely so explicit user choice always wins.
          const mappedOverride = mapAnalystRole(agentRoleOverride);
          const roleInference = mappedOverride
            ? {
                role: mappedOverride,
                confidence: 1,
                scores: {
                  soc_analyst: 0,
                  threat_hunter: 0,
                  security_engineer: 0,
                  ops_analyst: 0,
                  unknown: 0,
                  [mappedOverride]: 1,
                },
                eventCount: 0,
              }
            : await (async () => {
                logger.info('[AESOP] Phase 2: Inferring analyst role...');
                return inferAnalystRole(esClient, logger, userId);
              })();
          if (mappedOverride) {
            logger.info(
              `[AESOP] Analyst role provided by UI: ${describeRole(
                roleInference.role
              )} (raw="${agentRoleOverride}")`
            );
          } else if (agentRoleOverride) {
            logger.warn(
              `[AESOP] Could not map agent_role="${agentRoleOverride}" to a known role; falling back to inferred role ${describeRole(
                roleInference.role
              )}`
            );
          } else {
            logger.info(
              `[AESOP] Inferred role: ${describeRole(roleInference.role)} (confidence: ${(
                roleInference.confidence * 100
              ).toFixed(1)}%)`
            );
          }

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

          // Generate execution ID and initialize state tracking
          const executionId = `aesop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const stateTracker = new WorkflowStateTracker(currentUserClient, logger);
          await stateTracker.initializeExecution(executionId, 'aesop.self_exploration');

          logger.info(
            `[AESOP] Exploration initialized execution_id=${executionId} user_id=${userId} discovered_indices=${topIndices.length} inferred_role=${roleInference.role} sampling_strategy=${samplingConfig.strategyName}`
          );

          // Emit a single OTLP span for the exploration start so APM can
          // correlate the kickoff with the rest of the request transaction.
          // Note: array values (top_indices, scoped_indices) become string
          // attributes by way of the OTel attribute schema; consumers that
          // need them programmatically should query the same fields off the
          // execution document, which is the system of record.
          await withAesopSpan(
            'aesop.exploration.started',
            {
              attributes: {
                'aesop.kind': 'workflow_step',
                'aesop.step_name': 'exploration_started',
                'aesop.workflow_name': 'aesop.autonomous_exploration',
                'aesop.execution_id': executionId,
                'aesop.user_id': userId,
                'aesop.analyst_role': roleInference.role,
                'aesop.analyst_role_source': mappedOverride ? 'ui_override' : 'inferred',
                'aesop.discovered_indices_count': indexCatalog.indices.length,
                'aesop.top_indices': topIndices,
                'aesop.sampling_strategy': samplingConfig.strategyName,
                'aesop.mode': explorationMode ?? 'full',
                ...(requestedScopedIndices.length > 0
                  ? { 'aesop.scoped_indices': requestedScopedIndices }
                  : {}),
                ...(explorationDepth !== undefined
                  ? { 'aesop.exploration_depth': explorationDepth }
                  : {}),
                ...(minPatternFrequency !== undefined
                  ? { 'aesop.min_pattern_frequency': minPatternFrequency }
                  : {}),
              },
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
              overallTimeoutMs: explorationTimeoutMs,
              abortSignal: pluginStopSignal,
            }
          );
          executor.execute().catch((err) => {
            logger.error(
              `[AESOP] Background exploration failed error=${
                err instanceof Error ? err.message : String(err)
              }`
            );
          });

          const roleSourceLabel = mappedOverride ? 'selected role' : 'inferred role';
          return response.ok({
            body: {
              success: true,
              execution_id: executionId,
              workflow_name: 'aesop.self_exploration',
              status: 'running',
              started_at: new Date().toISOString(),
              message: `Autonomous exploration started. Discovered ${
                indexCatalog.indices.length
              } indices, ${roleSourceLabel}: ${describeRole(roleInference.role)}.`,
              applied_options: {
                mode: explorationMode,
                analyst_role: roleInference.role,
                analyst_role_source: mappedOverride ? 'ui_override' : 'inferred',
                scoped_indices:
                  requestedScopedIndices.length > 0 ? requestedScopedIndices : undefined,
                exploration_depth: explorationDepth,
                min_pattern_frequency: minPatternFrequency,
              },
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
