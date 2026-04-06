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
import type { AESOPRouteDependencies } from './register_aesop_routes';
import type { ProposedSkillDocument } from '../../lib/aesop/types';

const runSkillValidationParamsSchema = z.object({
  skillId: z.string(),
});

const runSkillValidationBodySchema = z.object({
  connector_id: z.string().min(1),
  auto_converge: z.boolean().optional().default(false),
  use_agent: z.boolean().optional().default(false),
});

export function registerRunSkillValidationRoute({ router, logger }: AESOPRouteDependencies) {
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
                void (async () => {
                  try {
                    const result = await orchestrator.validateSkill(skill.markdown || '');
                    if (result) {
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
                    }
                  } catch (err) {
                    logger.error(
                      `[AESOP] Agent-based validation failed, results not saved skill_id=${skillId}: ${
                        err instanceof Error ? err.message : String(err)
                      }`
                    );
                    // Fall back: mark as failed so user can retry with direct LLM
                    await esClient
                      .update({
                        index: '.aesop-proposed-skills',
                        id: skillId,
                        doc: {
                          validation: { status: 'failed', error: 'Agent validation failed' },
                        },
                      })
                      .catch(() => {});
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
            // 4a. Use convergence loop: iterate improve->validate until passing
            const { ConvergenceLoop } = await import('../../lib/aesop/validation/convergence_loop');

            const loop = new ConvergenceLoop({
              threshold: 0.85,
              maxIterations: 5,
              convergenceDelta: 0.02,
              validate: async () => {
                return await runLLMValidationAndGetScore({
                  esClient,
                  actionsClient,
                  connectorId,
                  skillId,
                  skill,
                  logger,
                });
              },
              improve: async () => {
                await runLLMImprovement({
                  esClient,
                  actionsClient,
                  connectorId,
                  skillId,
                  logger,
                });
              },
              onError: (error, iteration) => {
                logger.error(
                  `[AESOP] Convergence loop error at iteration ${iteration} skill_id=${skillId}: ${
                    error instanceof Error ? error.message : String(error)
                  }`
                );
              },
            });

            // Fire-and-forget the convergence loop
            loop
              .run()
              .then(async (convergenceResult) => {
                // Store convergence metadata
                await esClient.update({
                  index: '.aesop-proposed-skills',
                  id: skillId,
                  doc: {
                    validation: {
                      status: convergenceResult.converged ? 'passed' : 'failed',
                      final_score: convergenceResult.finalScore,
                      completed_at: new Date().toISOString(),
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
              })
              .catch((err) => {
                logger.error(
                  `[AESOP] Convergence loop failed skill_id=${skillId}: ${
                    err instanceof Error ? err.message : String(err)
                  }`
                );
              });
          } else {
            // 4b. Single-pass validation (existing behavior)
            runLLMValidation({
              esClient,
              actionsClient,
              connectorId,
              skillId,
              skill,
              logger,
            }).catch((err) => {
              logger.error(
                `[AESOP] Background LLM validation failed skill_id=${skillId}: ${
                  err instanceof Error ? err.message : String(err)
                }`
              );
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

async function runLLMValidation({
  esClient,
  actionsClient,
  connectorId,
  skillId,
  skill,
  logger,
}: {
  esClient: ElasticsearchClient;

  actionsClient: any;
  connectorId: string;
  skillId: string;
  skill: ProposedSkillDocument;
  logger: Logger;
}) {
  const startTime = Date.now();
  const evalTraceId = `aesop-eval-${skillId}-${Date.now()}`;

  try {
    // Build the evaluation prompt
    const systemPrompt =
      'You are an expert skill evaluator for a security operations platform. ' +
      'Evaluate the proposed Agent Builder skill across these criteria:\n' +
      '1. **Relevance** (0-1): Is this skill useful for security analysts?\n' +
      '2. **Completeness** (0-1): Does the skill content provide enough detail for an AI agent to execute it?\n' +
      '3. **Accuracy** (0-1): Are the described patterns/queries correct for the data sources?\n' +
      '4. **Specificity** (0-1): Is the skill specific enough to be actionable (not too generic)?\n' +
      '5. **Safety** (0-1): Does the skill avoid dangerous operations (write/delete/modify data)?\n\n' +
      'Respond with a JSON object:\n' +
      '{ "score": <weighted average 0.0-1.0>, "passed": <true if score >= 0.85>, ' +
      '"criteria": { "relevance": <0-1>, "completeness": <0-1>, "accuracy": <0-1>, "specificity": <0-1>, "safety": <0-1> }, ' +
      '"feedback": "<detailed 2-3 sentence summary>", ' +
      '"strengths": ["..."], "weaknesses": ["..."], "suggestions": ["..."] }';
    const userPrompt = buildValidationPrompt(skill);

    // Execute LLM connector
    const result = await actionsClient.execute({
      actionId: connectorId,
      params: {
        subAction: 'run',
        subActionParams: {
          body: JSON.stringify({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.3,
          }),
        },
      },
    });

    if (result.status === 'error') {
      throw new Error(`Connector execution failed: ${result.message} - ${result.serviceMessage}`);
    }

    // Parse LLM response
    const llmRawResponse = extractLLMResponse(result.data);
    const evaluation = parseLLMEvaluation(llmRawResponse);

    const durationMs = Date.now() - startTime;

    logger.info(
      `[AESOP] LLM validation completed skill_id=${skillId} score=${evaluation.score} passed=${evaluation.passed} duration_ms=${durationMs} eval_trace_id=${evalTraceId}`
    );

    // Update skill with validation results
    await esClient.update({
      index: '.aesop-proposed-skills',
      id: skillId,
      doc: {
        validation: {
          status: evaluation.passed ? 'passed' : 'failed',
          final_score: evaluation.score,
          started_at: skill.validation?.started_at || new Date().toISOString(),
          completed_at: new Date().toISOString(),
          connector_id: connectorId,
          eval_trace_id: evalTraceId,
          duration_ms: durationMs,
          criteria: evaluation.criteria,
          llm_feedback: evaluation.feedback,
          strengths: evaluation.strengths,
          weaknesses: evaluation.weaknesses,
          suggestions: evaluation.suggestions,
          llm_prompt: userPrompt,
          llm_raw_response: llmRawResponse,
          iterations: [{ score: evaluation.score, iteration: 1 }],
        },
      },
      refresh: 'wait_for',
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;

    logger.error(
      `[AESOP] LLM validation failed skill_id=${skillId} duration_ms=${durationMs}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );

    // Mark as failed — preserve previous score if it exists
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

function buildValidationPrompt(skill: ProposedSkillDocument): string {
  return `Evaluate this proposed Agent Builder skill for a Security Operations platform:

## Skill Name
${skill.name}

## Description
${skill.description}

## Skill Content (Markdown)
${skill.markdown || skill.content || 'No content available'}

## Discovery Context
- Confidence: ${(skill.confidence * 100).toFixed(1)}%
- Pattern Frequency: ${skill.source?.pattern_frequency || 'unknown'} occurrences
- Rationale: ${skill.source?.rationale || 'N/A'}
- Source Indices: ${JSON.stringify(
    skill.source?.source_indices || skill.metadata?.source_indices || []
  )}

## Evaluation Criteria
1. **Relevance** (0-1): Is this skill useful for security analysts?
2. **Completeness** (0-1): Does the skill content provide enough detail for an AI agent to execute it?
3. **Accuracy** (0-1): Are the described patterns/queries correct for the data sources?
4. **Specificity** (0-1): Is the skill specific enough to be actionable (not too generic)?
5. **Safety** (0-1): Does the skill avoid dangerous operations (write/delete/modify data)?

Respond with ONLY a JSON object (no markdown fences):
{ "score": <weighted average 0.0-1.0>, "passed": <true if score >= 0.85>, "criteria": { "relevance": <0-1>, "completeness": <0-1>, "accuracy": <0-1>, "specificity": <0-1>, "safety": <0-1> }, "feedback": "<2-3 sentence summary>", "strengths": ["..."], "weaknesses": ["..."], "suggestions": ["..."] }`;
}

function extractLLMResponse(data: any): string {
  // Handle different connector response formats
  if (typeof data === 'string') return data;
  // OpenAI format
  if (data?.choices?.[0]?.message?.content) return data.choices[0].message.content;
  // Bedrock format
  if (data?.completion) return data.completion;
  if (data?.content?.[0]?.text) return data.content[0].text;
  // Gemini format
  if (data?.candidates?.[0]?.content?.parts?.[0]?.text)
    return data.candidates[0].content.parts[0].text;
  // Fallback
  return JSON.stringify(data);
}

interface CriteriaScores {
  relevance: number;
  completeness: number;
  accuracy: number;
  specificity: number;
  safety: number;
}

interface LLMEvaluation {
  score: number;
  passed: boolean;
  criteria: CriteriaScores;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

function parseLLMEvaluation(response: string): LLMEvaluation {
  const defaultCriteria: CriteriaScores = {
    relevance: 0,
    completeness: 0,
    accuracy: 0,
    specificity: 0,
    safety: 0,
  };

  const defaults: LLMEvaluation = {
    score: 0.5,
    passed: false,
    criteria: defaultCriteria,
    feedback: 'Unable to parse LLM evaluation response',
    strengths: [],
    weaknesses: [],
    suggestions: [],
  };

  try {
    // Strip DeepSeek-R1 <think>...</think> tags, markdown fences, and other wrappers
    let cleaned = response;
    // Remove <think>...</think> reasoning blocks (DeepSeek-R1)
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, '');
    // Remove markdown code fences
    cleaned = cleaned.replace(/```json?\s*/g, '').replace(/```\s*/g, '');
    cleaned = cleaned.trim();
    // If there's still no JSON-like content, try to extract it
    if (!cleaned.startsWith('{')) {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }
    }
    const parsed = JSON.parse(cleaned);

    const criteria: CriteriaScores = {
      relevance: Number(parsed.criteria?.relevance) || 0,
      completeness: Number(parsed.criteria?.completeness) || 0,
      accuracy: Number(parsed.criteria?.accuracy) || 0,
      specificity: Number(parsed.criteria?.specificity) || 0,
      safety: Number(parsed.criteria?.safety) || 0,
    };

    return {
      score: Math.max(0, Math.min(1, Number(parsed.score) || 0.5)),
      passed: parsed.passed ?? Number(parsed.score) >= 0.85,
      criteria,
      feedback: String(parsed.feedback || defaults.feedback),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };
  } catch {
    // If JSON parse fails, try to extract a score from the text
    const scoreMatch = response.match(/"score"\s*:\s*([\d.]+)/);
    if (scoreMatch) {
      const score = Number(scoreMatch[1]);
      return { ...defaults, score, passed: score >= 0.85 };
    }
    return defaults;
  }
}

/**
 * Run LLM validation and return the score without persisting results.
 * Used by the convergence loop to evaluate each iteration.
 */
async function runLLMValidationAndGetScore({
  esClient,
  actionsClient,
  connectorId,
  skillId,
  skill,
  logger,
}: {
  esClient: ElasticsearchClient;

  actionsClient: any;
  connectorId: string;
  skillId: string;
  skill: ProposedSkillDocument;
  logger: Logger;
}): Promise<{ score: number; passed: boolean }> {
  // Re-read the skill in case it was improved since the loop started
  const skillDoc = await esClient.get({
    index: '.aesop-proposed-skills',
    id: skillId,
  });
  const currentSkill = skillDoc._source as ProposedSkillDocument | undefined;
  if (!currentSkill) {
    throw new Error(`Skill ${skillId} source unavailable`);
  }

  const systemPrompt =
    'You are an expert skill evaluator for a security operations platform. ' +
    'Evaluate the proposed Agent Builder skill across these criteria:\n' +
    '1. **Relevance** (0-1): Is this skill useful for security analysts?\n' +
    '2. **Completeness** (0-1): Does the skill content provide enough detail for an AI agent to execute it?\n' +
    '3. **Accuracy** (0-1): Are the described patterns/queries correct for the data sources?\n' +
    '4. **Specificity** (0-1): Is the skill specific enough to be actionable (not too generic)?\n' +
    '5. **Safety** (0-1): Does the skill avoid dangerous operations (write/delete/modify data)?\n\n' +
    'Respond with a JSON object:\n' +
    '{ "score": <weighted average 0.0-1.0>, "passed": <true if score >= 0.85>, ' +
    '"criteria": { "relevance": <0-1>, "completeness": <0-1>, "accuracy": <0-1>, "specificity": <0-1>, "safety": <0-1> }, ' +
    '"feedback": "<detailed 2-3 sentence summary>", ' +
    '"strengths": ["..."], "weaknesses": ["..."], "suggestions": ["..."] }';
  const userPrompt = buildValidationPrompt(currentSkill);

  const result = await actionsClient.execute({
    actionId: connectorId,
    params: {
      subAction: 'run',
      subActionParams: {
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
        }),
      },
    },
  });

  if (result.status === 'error') {
    throw new Error(`Connector execution failed: ${result.message} - ${result.serviceMessage}`);
  }

  const llmRawResponse = extractLLMResponse(result.data);
  const evaluation = parseLLMEvaluation(llmRawResponse);

  logger.info(
    `[AESOP] Convergence iteration validated skill_id=${skillId} score=${evaluation.score} passed=${evaluation.passed}`
  );

  // Persist the latest evaluation details (criteria, feedback, etc.) for the UI
  await esClient.update({
    index: '.aesop-proposed-skills',
    id: skillId,
    doc: {
      validation: {
        status: 'validating',
        final_score: evaluation.score,
        connector_id: connectorId,
        criteria: evaluation.criteria,
        llm_feedback: evaluation.feedback,
        strengths: evaluation.strengths,
        weaknesses: evaluation.weaknesses,
        suggestions: evaluation.suggestions,
        llm_raw_response: llmRawResponse,
      },
    },
    refresh: 'wait_for',
  });

  return { score: evaluation.score, passed: evaluation.passed };
}

/**
 * Run LLM improvement for the convergence loop.
 * Reads the current skill + validation feedback, generates improvements, and saves them.
 */
async function runLLMImprovement({
  esClient,
  actionsClient,
  connectorId,
  skillId,
  logger,
}: {
  esClient: ElasticsearchClient;

  actionsClient: any;
  connectorId: string;
  skillId: string;
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

  if (!skill.validation?.llm_feedback) {
    logger.warn(
      `[AESOP] No validation feedback available for improvement, skipping skill_id=${skillId}`
    );
    return;
  }

  const prompt = `Improve this Agent Builder skill based on the validation feedback below.

## Current Skill
**Name:** ${skill.name}
**Description:** ${skill.description}

**Content:**
${skill.markdown || skill.content || ''}

## Validation Results (Score: ${((skill.validation?.final_score || 0) * 100).toFixed(0)}%)

**Feedback:** ${skill.validation?.llm_feedback || 'N/A'}

**Weaknesses:**
${(skill.validation?.weaknesses || []).map((w: string) => `- ${w}`).join('\n')}

**Suggestions:**
${(skill.validation?.suggestions || []).map((s: string) => `- ${s}`).join('\n')}

Apply all suggestions and fix all weaknesses. Make the skill specific, actionable, and complete.
Return the improved skill as JSON: { "name": "...", "description": "...", "markdown": "..." }`;

  const result = await actionsClient.execute({
    actionId: connectorId,
    params: {
      subAction: 'run',
      subActionParams: {
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content:
                'You are an expert at improving Agent Builder skills for security operations. ' +
                'Given a skill and its validation feedback, produce an improved version. ' +
                'Respond with ONLY a JSON object (no markdown fences):\n' +
                '{ "name": "<improved name>", "description": "<improved description>", "markdown": "<improved full markdown content>" }',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.4,
        }),
      },
    },
  });

  if (result.status === 'error') {
    throw new Error(`Connector execution failed: ${result.message} - ${result.serviceMessage}`);
  }

  const llmResponse = extractLLMResponse(result.data);
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
