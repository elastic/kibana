/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/evals-common';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { AESOPRouteDependencies } from './register_aesop_routes';
import type { ProposedSkillDocument, SkillEvaluatorResult } from '../../lib/aesop/types';
import {
  buildLlmRequestBody,
  extractLlmResponseText,
  getConnectorTypeId,
} from '../../lib/aesop/llm_defaults';
import {
  createEvaluationRunner,
  type EvaluatorRegistry,
  type ServerEvaluatorResult,
} from '../../lib/evaluation_engine';
import { createActionsInferenceClient } from '../../lib/aesop/actions_inference_adapter';
import { buildValidationSummary } from '../../lib/aesop/validation_result_builder';
import { runConvergenceLoop } from '../../lib/aesop/convergence_loop';

type ActionsClient = Awaited<ReturnType<ActionsPluginStart['getActionsClientWithRequest']>>;

/**
 * Composite score threshold at which a skill is considered "passed". This is
 * the server-side gate — the LLM judges' self-reported `passed` field (if any)
 * is ignored. The UI also uses 0.85 as the display threshold.
 */
const PASS_THRESHOLD = 0.85;

/**
 * Evaluators that MUST pass (score >= 0.7, label != 'fail') for the skill to
 * be gated as passed, regardless of composite score. These are either safety
 * gates (no hard-coded secrets, no prompt injection, no PII) or grounding
 * gates (references resolve on the active cluster).
 */
const REQUIRED_PASS_EVALUATORS = [
  'skill-safety',
  'skill-pii',
  'skill-secret-scanner',
  'skill-prompt-injection',
  'backing-index-validator',
];

const SKILL_PRESET_EVALUATORS = [
  'skill-relevance',
  'skill-completeness',
  'skill-accuracy',
  'skill-specificity',
  'skill-safety',
  'backing-index-validator',
  'esql-pattern',
  'esql-compile',
  'skill-index-resolves',
  'skill-pii',
  'skill-secret-scanner',
  'skill-prompt-injection',
];

const runSkillValidationParamsSchema = z.object({
  skillId: z.string(),
});

const runSkillValidationBodySchema = z.object({
  connector_id: z.string().min(1),
  auto_converge: z.boolean().optional().default(false),
  use_agent: z.boolean().optional().default(false),
});

// Hard upper bound on how long an in-flight validation can remain in the
// 'validating' state before the watchdog forces it to 'failed'. Without this
// the background LLM call (agent or convergence) can hang silently — e.g. the
// Bedrock connector can keep a socket open well past our route timeout — and
// leave the proposed-skill row stuck in 'validating' forever, blocking retries.
const VALIDATION_WATCHDOG_MS = 15 * 60 * 1000;

export function registerRunSkillValidationRoute({
  router,
  logger,
  evaluatorRegistry,
}: AESOPRouteDependencies) {
  if (!evaluatorRegistry) {
    // The route is registered with a logger-only fallback in older code
    // paths; refuse to start rather than silently regressing to the
    // monolithic LLM prompt.
    throw new Error('registerRunSkillValidationRoute: evaluatorRegistry dependency is required');
  }
  router.versioned
    .post({
      path: '/internal/aesop/skills/{skillId}/validate',
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
            params: buildRouteValidationWithZod(runSkillValidationParamsSchema),
            body: buildRouteValidationWithZod(runSkillValidationBodySchema),
          },
        },
      },
      async (context, request, response) => {
        const coreContext = await context.core;
        const evalsContext = await context.evals;
        const esClient = coreContext.elasticsearch.client.asCurrentUser;

        const { skillId } = request.params;
        const {
          connector_id: connectorId,
          auto_converge: autoConverge,
          use_agent: useAgent,
        } = request.body;

        try {
          // 1. Load skill
          const skillDoc = await esClient.get({
            index: '.aesop-proposed-skills',
            id: skillId,
          });

          const skill = skillDoc._source as ProposedSkillDocument | undefined;
          if (!skill) {
            return response.notFound({
              body: { message: `Skill ${skillId} not found or source unavailable` },
            });
          }

          logger.info(
            `[AESOP] Starting LLM-based skill validation skill_id=${skillId} skill_name=${skill.name} connector_id=${connectorId}`
          );

          // 2. Mark as validating
          await esClient.update({
            index: '.aesop-proposed-skills',
            id: skillId,
            doc: {
              validation: {
                status: 'validating',
                started_at: new Date().toISOString(),
                connector_id: connectorId,
              },
            },
          });

          // 3. Get actions client for LLM execution
          const actionsStart = evalsContext.getActionsStart();
          if (!actionsStart) {
            throw new Error('Actions plugin not available — cannot execute LLM connector');
          }

          const actionsClient = await actionsStart.getActionsClientWithRequest(request);

          // Try agent-based validation if requested and available
          if (useAgent) {
            const agentBuilderStart = await evalsContext.getAgentBuilderStart();
            if (agentBuilderStart) {
              try {
                const { AgentOrchestrator } = await import(
                  '../../lib/aesop/agents/agent_orchestrator'
                );
                const { ensureAesopAgents } = await import('../../lib/aesop/agents/ensure_agents');

                const agentRegistry = await agentBuilderStart.agents.getRegistry({ request });
                await ensureAesopAgents(agentRegistry, logger);

                const orchestrator = new AgentOrchestrator({
                  agentBuilderStart,
                  request,
                  connectorId,
                  logger,
                });

                // Fire-and-forget agent-based validation
                const agentStartTime = Date.now();
                const cancelWatchdog = startValidationWatchdog({
                  esClient,
                  skillId,
                  mode: 'agent',
                  logger,
                });
                void (async () => {
                  try {
                    const result = await orchestrator.validateSkill(skill.markdown || '');
                    if (!result) {
                      // Orchestrator returned nothing — treat as a failure so the
                      // skill does not sit in 'validating' indefinitely.
                      await markValidationFailed({
                        esClient,
                        skillId,
                        reason: 'Agent orchestrator returned no result',
                        logger,
                      });
                      return;
                    }
                    await esClient.update({
                      index: '.aesop-proposed-skills',
                      id: skillId,
                      doc: {
                        validation: {
                          status: result.passed ? 'passed' : 'failed',
                          final_score: result.score,
                          completed_at: new Date().toISOString(),
                          connector_id: connectorId,
                          duration_ms: Date.now() - agentStartTime,
                          criteria: result.criteria,
                          llm_feedback: result.feedback,
                          strengths: result.strengths,
                          weaknesses: result.weaknesses,
                          suggestions: result.suggestions,
                          iterations: [{ score: result.score, iteration: 1 }],
                          validated_by: 'agent',
                        },
                      },
                      refresh: 'wait_for',
                    });
                  } catch (err) {
                    logger.error(
                      `[AESOP] Agent-based validation failed, results not saved skill_id=${skillId}: ${
                        err instanceof Error ? err.message : String(err)
                      }`
                    );
                    await markValidationFailed({
                      esClient,
                      skillId,
                      reason: `Agent validation failed: ${
                        err instanceof Error ? err.message : String(err)
                      }`,
                      logger,
                    });
                  } finally {
                    cancelWatchdog();
                  }
                })();

                return response.ok({
                  body: {
                    success: true,
                    skill_id: skillId,
                    skill_name: skill.name,
                    status: 'validating',
                    message: `Agent-based validation started for skill: ${skill.name}`,
                    mode: 'agent',
                  },
                });
              } catch (err) {
                logger.warn(
                  `[AESOP] Agent validation setup failed, falling back to direct LLM: ${
                    err instanceof Error ? err.message : String(err)
                  }`
                );
                // Fall through to direct LLM validation
              }
            }
          }

          if (autoConverge) {
            // 4a. Convergence loop: iterate improve→validate until the server-
            // side gate passes or we hit maxIterations. Uses the evaluator
            // registry (per-criterion evaluators, CODE gates, multi-step
            // scoring) — no monolithic LLM prompt.
            const cancelWatchdog = startValidationWatchdog({
              esClient,
              skillId,
              mode: 'convergence',
              logger,
            });
            void runConvergenceValidation({
              esClient,
              actionsClient,
              connectorId,
              skillId,
              skill,
              evaluatorRegistry,
              logger,
            })
              .catch(async (err) => {
                logger.error(
                  `[AESOP] Convergence validation failed skill_id=${skillId}: ${
                    err instanceof Error ? err.message : String(err)
                  }`
                );
                await markValidationFailed({
                  esClient,
                  skillId,
                  reason: `Convergence validation failed: ${
                    err instanceof Error ? err.message : String(err)
                  }`,
                  logger,
                });
              })
              .finally(() => {
                cancelWatchdog();
              });
          } else {
            // 4b. Single-pass validation — one trip through the evaluator
            // registry, no improvement loop. Watchdog preserves Step-6
            // stuck-state correctness.
            const cancelWatchdog = startValidationWatchdog({
              esClient,
              skillId,
              mode: 'single',
              logger,
            });
            runLLMValidation({
              esClient,
              actionsClient,
              connectorId,
              skillId,
              skill,
              evaluatorRegistry,
              logger,
            })
              .catch((err) => {
                logger.error(
                  `[AESOP] Background LLM validation failed skill_id=${skillId}: ${
                    err instanceof Error ? err.message : String(err)
                  }`
                );
              })
              .finally(() => {
                cancelWatchdog();
              });
          }

          return response.ok({
            body: {
              success: true,
              skill_id: skillId,
              skill_name: skill.name,
              status: 'validating',
              message: autoConverge
                ? `Convergence validation started for skill: ${skill.name}`
                : `LLM validation started for skill: ${skill.name}`,
            },
          });
        } catch (error) {
          logger.error(
            `[AESOP] Failed to start validation skill_id=${skillId}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );

          // Revert skill status on setup failure
          await esClient
            .update({
              index: '.aesop-proposed-skills',
              id: skillId,
              doc: { validation: { status: 'pending' } },
            })
            .catch((revertErr) => {
              logger.warn(
                `[AESOP] Failed to revert skill status after validation setup failure: ${
                  revertErr instanceof Error ? revertErr.message : String(revertErr)
                }`
              );
            });

          return response.customError({
            statusCode: 500,
            body: {
              message: `Failed to start validation: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          });
        }
      }
    );
}

/**
 * Runs the evaluator registry against a skill's current markdown. This
 * replaces the old monolithic 5-criteria LLM prompt with a per-criterion
 * evaluator pipeline: every CODE evaluator (secret scanner, prompt injection,
 * index resolves, esql-compile, backing-index validator, PII) runs first,
 * then the five LLM judges (relevance/completeness/accuracy/specificity/
 * safety) run in parallel. `passed` is determined server-side from the gate
 * result — we no longer trust any LLM self-report.
 */
async function runSkillEvaluators({
  actionsClient,
  connectorId,
  esClient,
  evaluatorRegistry,
  skill,
  logger,
}: {
  actionsClient: ActionsClient;
  connectorId: string;
  esClient: ElasticsearchClient;
  evaluatorRegistry: EvaluatorRegistry;
  skill: ProposedSkillDocument;
  logger: Logger;
}): Promise<ServerEvaluatorResult[]> {
  const inferenceClient = createActionsInferenceClient({
    actionsClient,
    connectorId,
    logger,
    baseSystemPrompt:
      'You are an expert evaluator for Agent Builder skills used in a Security Operations platform. ' +
      'Score strictly per the rubric you are given and respond with only the requested JSON.',
    temperature: 0.1,
  });

  const runner = createEvaluationRunner(evaluatorRegistry, logger);
  const runResult = await runner.run({
    items: [
      {
        input: {
          name: skill.name,
          description: skill.description,
          confidence: skill.confidence,
          source: skill.source ?? {},
        },
        output: skill.markdown || skill.content || '',
      },
    ],
    evaluatorNames: SKILL_PRESET_EVALUATORS,
    connectorId,
    requiredPass: REQUIRED_PASS_EVALUATORS,
    inferenceClient,
    esClient,
  });

  return runResult.results[0]?.evaluatorResults ?? [];
}

async function runLLMValidation({
  esClient,
  actionsClient,
  connectorId,
  skillId,
  skill,
  evaluatorRegistry,
  logger,
}: {
  esClient: ElasticsearchClient;
  actionsClient: ActionsClient;
  connectorId: string;
  skillId: string;
  skill: ProposedSkillDocument;
  evaluatorRegistry: EvaluatorRegistry;
  logger: Logger;
}) {
  const startTime = Date.now();
  const evalTraceId = `aesop-eval-${skillId}-${Date.now()}`;

  try {
    const evaluatorResults = await runSkillEvaluators({
      actionsClient,
      connectorId,
      esClient,
      evaluatorRegistry,
      skill,
      logger,
    });

    const summary = buildValidationSummary(evaluatorResults, {
      requiredPass: REQUIRED_PASS_EVALUATORS,
      compositeThreshold: PASS_THRESHOLD,
    });

    const durationMs = Date.now() - startTime;

    logger.info(
      `[AESOP] Registry validation completed skill_id=${skillId} score=${summary.score.toFixed(
        3
      )} passed=${summary.passed} duration_ms=${durationMs} eval_trace_id=${evalTraceId}`
    );

    await esClient.update({
      index: '.aesop-proposed-skills',
      id: skillId,
      doc: {
        validation: {
          status: summary.passed ? 'passed' : 'failed',
          final_score: summary.score,
          started_at: skill.validation?.started_at || new Date().toISOString(),
          completed_at: new Date().toISOString(),
          connector_id: connectorId,
          eval_trace_id: evalTraceId,
          duration_ms: durationMs,
          criteria: summary.criteria,
          llm_feedback: summary.feedback,
          strengths: summary.strengths,
          weaknesses: summary.weaknesses,
          suggestions: summary.suggestions,
          evaluator_results: summary.evaluatorResults,
          gate: summary.gate,
          iterations: [{ score: summary.score, iteration: 1 }],
        },
      },
      refresh: 'wait_for',
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;

    logger.error(
      `[AESOP] Registry validation failed skill_id=${skillId} duration_ms=${durationMs}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );

    await esClient
      .update({
        index: '.aesop-proposed-skills',
        id: skillId,
        doc: {
          validation: {
            status: 'failed',
            completed_at: new Date().toISOString(),
            duration_ms: durationMs,
            error: error instanceof Error ? error.message : String(error),
          },
        },
        refresh: 'wait_for',
      })
      .catch((markFailedErr) => {
        logger.warn(
          `[AESOP] Failed to mark skill as failed: ${
            markFailedErr instanceof Error ? markFailedErr.message : String(markFailedErr)
          }`
        );
      });
  }
}

/**
 * Convergence validation: uses `runConvergenceLoop` from `lib/aesop` (the
 * registry-backed implementation) instead of the old class-based
 * `ConvergenceLoop` helper that wrapped the monolithic LLM prompt.
 *
 * Each iteration:
 *  1. Runs the full evaluator registry against the current markdown.
 *  2. Persists the per-iteration snapshot so the UI shows progress.
 *  3. Calls `runLLMImprovement` to rewrite the skill using the evaluator
 *     feedback before the next iteration.
 */
async function runConvergenceValidation({
  esClient,
  actionsClient,
  connectorId,
  skillId,
  skill,
  evaluatorRegistry,
  logger,
}: {
  esClient: ElasticsearchClient;
  actionsClient: ActionsClient;
  connectorId: string;
  skillId: string;
  skill: ProposedSkillDocument;
  evaluatorRegistry: EvaluatorRegistry;
  logger: Logger;
}) {
  const inferenceClient = createActionsInferenceClient({
    actionsClient,
    connectorId,
    logger,
    baseSystemPrompt:
      'You are an expert evaluator for Agent Builder skills used in a Security Operations platform. ' +
      'Score strictly per the rubric you are given and respond with only the requested JSON.',
    temperature: 0.1,
  });

  const startTime = Date.now();
  const evalTraceId = `aesop-converge-${skillId}-${Date.now()}`;

  const convergenceResult = await runConvergenceLoop(
    skill,
    {
      threshold: PASS_THRESHOLD,
      maxIterations: 5,
      convergenceDelta: 0.02,
      connectorId,
      evaluators: SKILL_PRESET_EVALUATORS,
      requiredPass: REQUIRED_PASS_EVALUATORS,
    },
    {
      evaluatorRegistry,
      logger,
      inferenceClient,
      esClient,
      improveSkill: async (currentSkill, feedback) => {
        await runLLMImprovement({
          esClient,
          actionsClient,
          connectorId,
          skillId,
          feedback,
          logger,
        });
        // Re-fetch so the next iteration sees the improved markdown.
        const updated = await esClient.get({
          index: '.aesop-proposed-skills',
          id: skillId,
        });
        const next = updated._source as ProposedSkillDocument | undefined;
        if (!next) {
          throw new Error(`Skill ${skillId} disappeared during improvement`);
        }
        return next;
      },
      onIteration: async (iteration) => {
        // Build a live summary from this iteration's evaluator results so
        // the UI shows progress without waiting for the full loop to finish.
        const serverResults = iteration.evaluator_results.map((r) => skillResultToServerResult(r));
        const summary = buildValidationSummary(serverResults, {
          requiredPass: REQUIRED_PASS_EVALUATORS,
          compositeThreshold: PASS_THRESHOLD,
        });
        await esClient
          .update({
            index: '.aesop-proposed-skills',
            id: skillId,
            doc: {
              validation: {
                status: 'validating',
                final_score: summary.score,
                connector_id: connectorId,
                criteria: summary.criteria,
                llm_feedback: summary.feedback,
                strengths: summary.strengths,
                weaknesses: summary.weaknesses,
                suggestions: summary.suggestions,
                evaluator_results: summary.evaluatorResults,
              },
            },
            refresh: 'wait_for',
          })
          .catch((err) => {
            logger.warn(
              `[AESOP] Failed to persist iteration snapshot skill_id=${skillId}: ${
                err instanceof Error ? err.message : String(err)
              }`
            );
          });
      },
    }
  );

  const durationMs = Date.now() - startTime;
  const finalIter = convergenceResult.iterations[convergenceResult.iterations.length - 1];

  const finalSummary = finalIter
    ? buildValidationSummary(
        finalIter.evaluator_results.map((r) => skillResultToServerResult(r)),
        { requiredPass: REQUIRED_PASS_EVALUATORS, compositeThreshold: PASS_THRESHOLD }
      )
    : null;

  logger.info(
    `[AESOP] Convergence validation completed skill_id=${skillId} score=${convergenceResult.finalScore.toFixed(
      3
    )} converged=${convergenceResult.converged} reason=${convergenceResult.reason} iterations=${
      convergenceResult.iterations.length
    } duration_ms=${durationMs}`
  );

  await esClient.update({
    index: '.aesop-proposed-skills',
    id: skillId,
    doc: {
      validation: {
        // Gate result is authoritative. We cross-check with convergenceResult
        // to avoid `converged: true` + `gate.passed: false` confusion (can't
        // happen today since the loop short-circuits on gate pass, but the
        // explicit check makes the invariant visible).
        status: convergenceResult.converged && finalSummary?.passed !== false ? 'passed' : 'failed',
        final_score: convergenceResult.finalScore,
        completed_at: new Date().toISOString(),
        connector_id: connectorId,
        eval_trace_id: evalTraceId,
        duration_ms: durationMs,
        criteria: finalSummary?.criteria ?? {},
        llm_feedback: finalSummary?.feedback ?? '',
        strengths: finalSummary?.strengths ?? [],
        weaknesses: finalSummary?.weaknesses ?? [],
        suggestions: finalSummary?.suggestions ?? [],
        evaluator_results: finalSummary?.evaluatorResults ?? [],
        gate: finalSummary?.gate ?? { passed: false, failedRequired: [] },
        convergence: {
          converged: convergenceResult.converged,
          reason: convergenceResult.reason,
          total_iterations: convergenceResult.iterations.length,
          total_duration_ms: convergenceResult.totalDurationMs,
        },
        iterations: convergenceResult.iterations,
      },
    },
    refresh: 'wait_for',
  });
}

/**
 * Map a `SkillEvaluatorResult` (convergence-loop shape) back to
 * `ServerEvaluatorResult` so it can be fed through `buildValidationSummary`.
 * `SkillEvaluatorResult` drops `label`/`metadata` — we reconstruct `label`
 * from `pass` so the summary's strength/weakness logic keeps working.
 */
function skillResultToServerResult(r: SkillEvaluatorResult): ServerEvaluatorResult {
  return {
    evaluator: r.evaluator,
    kind: (r.kind as ServerEvaluatorResult['kind']) ?? 'LLM',
    score: r.score,
    label: r.score == null ? 'skipped' : r.pass ? 'pass' : 'fail',
    explanation: r.explanation,
    traceId: r.trace_id,
  };
}

/**
 * Run LLM improvement for the convergence loop.
 *
 * Takes the per-iteration evaluator feedback produced by the evaluator
 * registry rather than reading `validation.llm_feedback` off the skill SO
 * — the SO snapshot can be stale relative to the current loop iteration,
 * and the registry results are richer (one entry per evaluator with the
 * specific failure mode). We feed the weak/skipped evaluators straight
 * into the rewrite prompt so the LLM addresses them individually.
 */
async function runLLMImprovement({
  esClient,
  actionsClient,
  connectorId,
  skillId,
  feedback,
  logger,
}: {
  esClient: ElasticsearchClient;
  actionsClient: ActionsClient;
  connectorId: string;
  skillId: string;
  feedback: SkillEvaluatorResult[];
  logger: Logger;
}): Promise<void> {
  const skillDoc = await esClient.get({
    index: '.aesop-proposed-skills',
    id: skillId,
  });
  const skill = skillDoc._source as ProposedSkillDocument | undefined;
  if (!skill) {
    throw new Error(`Skill ${skillId} source unavailable`);
  }

  const weaknesses = feedback.filter((r) => !r.pass && r.score != null);
  const skipped = feedback.filter((r) => r.score == null);

  if (weaknesses.length === 0 && skipped.length === 0) {
    logger.info(`[AESOP] No weaknesses to improve, skipping improvement skill_id=${skillId}`);
    return;
  }

  const weaknessBlock = weaknesses
    .map(
      (r) =>
        `- **${r.evaluator}** (score ${r.score?.toFixed(2) ?? 'n/a'}): ${
          r.explanation || 'no explanation'
        }`
    )
    .join('\n');
  const skippedBlock = skipped.length
    ? `\n**Unable to score (evaluator skipped):**\n${skipped
        .map((r) => `- ${r.evaluator}: ${r.explanation || 'missing prerequisite'}`)
        .join('\n')}`
    : '';

  const prompt = `Improve this Agent Builder skill based on the per-evaluator feedback below.

## Current Skill
**Name:** ${skill.name}
**Description:** ${skill.description}

**Content:**
${skill.markdown || skill.content || ''}

## Evaluator Feedback

**Failed / Weak:**
${weaknessBlock || '(none)'}
${skippedBlock}

For every failing evaluator, make a targeted edit to the skill markdown that would flip the result to passing. Do not lower scores elsewhere.
Return the improved skill as JSON: { "name": "...", "description": "...", "markdown": "..." }`;

  const connectorTypeId = await getConnectorTypeId(actionsClient, connectorId);

  const result = await actionsClient.execute({
    actionId: connectorId,
    params: {
      subAction: 'run',
      subActionParams: {
        body: JSON.stringify(
          buildLlmRequestBody({
            system:
              'You are an expert at improving Agent Builder skills for security operations. ' +
              'Given a skill and its validation feedback, produce an improved version. ' +
              'Respond with ONLY a JSON object (no markdown fences):\n' +
              '{ "name": "<improved name>", "description": "<improved description>", "markdown": "<improved full markdown content>" }',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.4,
            connectorTypeId,
          })
        ),
      },
    },
  });

  if (result.status === 'error') {
    throw new Error(`Connector execution failed: ${result.message} - ${result.serviceMessage}`);
  }

  const llmResponse = extractLlmResponseText(result.data);
  const improved = parseImprovedSkillResponse(llmResponse);

  await esClient.update({
    index: '.aesop-proposed-skills',
    id: skillId,
    doc: {
      name: improved.name,
      description: improved.description,
      markdown: improved.markdown,
      improvement_history: [
        ...(skill.improvement_history || []),
        {
          improved_at: new Date().toISOString(),
          improved_by: 'llm-convergence',
          connector_id: connectorId,
          previous_score: skill.validation?.final_score,
          feedback_applied: skill.validation?.llm_feedback,
        },
      ],
      last_edited_at: new Date().toISOString(),
      last_edited_by: 'llm-convergence',
    },
    refresh: 'wait_for',
  });

  logger.info(`[AESOP] Convergence iteration improved skill skill_id=${skillId}`);
}

/**
 * Best-effort transition of a proposed skill into the 'failed' state.
 *
 * Called from both the agent and convergence fire-and-forget paths so the
 * skill row never stays stuck in 'validating' when the background work can
 * no longer make progress. Uses a conditional script so we only overwrite
 * statuses that are still 'validating' — avoids racing with a success-path
 * update that already wrote 'passed' or 'failed'.
 */
async function markValidationFailed({
  esClient,
  skillId,
  reason,
  logger,
}: {
  esClient: ElasticsearchClient;
  skillId: string;
  reason: string;
  logger: Logger;
}): Promise<void> {
  try {
    await esClient.update({
      index: '.aesop-proposed-skills',
      id: skillId,
      script: {
        lang: 'painless',
        source: `
          if (ctx._source.validation == null) { ctx._source.validation = new HashMap(); }
          if (ctx._source.validation.status == 'validating') {
            ctx._source.validation.status = 'failed';
            ctx._source.validation.completed_at = params.now;
            ctx._source.validation.error = params.reason;
          } else {
            ctx.op = 'noop';
          }
        `,
        params: { now: new Date().toISOString(), reason },
      },
      refresh: 'wait_for',
    });
  } catch (err) {
    logger.warn(
      `[AESOP] Failed to mark skill as failed skill_id=${skillId}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}

/**
 * Schedules a watchdog that forces the skill out of 'validating' after
 * VALIDATION_WATCHDOG_MS. Returns a canceller the success/failure paths
 * should invoke once they have written a terminal status, so we do not
 * clobber good results with a late timeout write.
 */
function startValidationWatchdog({
  esClient,
  skillId,
  mode,
  logger,
}: {
  esClient: ElasticsearchClient;
  skillId: string;
  mode: 'agent' | 'convergence' | 'single';
  logger: Logger;
}): () => void {
  const timer = setTimeout(() => {
    logger.warn(
      `[AESOP] Validation watchdog fired skill_id=${skillId} mode=${mode} after_ms=${VALIDATION_WATCHDOG_MS}`
    );
    void markValidationFailed({
      esClient,
      skillId,
      reason: `Validation exceeded ${Math.round(
        VALIDATION_WATCHDOG_MS / 60_000
      )}-minute watchdog timeout (mode=${mode})`,
      logger,
    });
  }, VALIDATION_WATCHDOG_MS);

  // Prevent the watchdog from keeping the Node event loop alive during
  // graceful shutdown.
  if (typeof timer.unref === 'function') timer.unref();

  return () => clearTimeout(timer);
}

function parseImprovedSkillResponse(response: string): {
  name: string;
  description: string;
  markdown: string;
} {
  try {
    let cleaned = response;
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, '');
    cleaned = cleaned
      .replace(/```json?\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    if (!cleaned.startsWith('{')) {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) cleaned = jsonMatch[0];
    }
    const parsed = JSON.parse(cleaned);
    return {
      name: String(parsed.name || 'Improved Skill'),
      description: String(parsed.description || ''),
      markdown: String(parsed.markdown || ''),
    };
  } catch {
    return {
      name: 'Improved Skill',
      description: '',
      markdown: response,
    };
  }
}
