/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/evals-common';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { AESOPRouteDependencies } from './register_aesop_routes';
import type { ProposedSkillDocument } from '../../lib/aesop/types';
import {
  buildLlmRequestBody,
  extractLlmResponseText,
  getConnectorTypeId,
} from '../../lib/aesop/llm_defaults';

type ActionsClient = Awaited<ReturnType<ActionsPluginStart['getActionsClientWithRequest']>>;

const improveSkillParamsSchema = z.object({
  skillId: z.string().min(1),
});

const improveSkillBodySchema = z.object({
  connector_id: z.string().min(1),
  use_agent: z.boolean().optional().default(false),
});

export function registerImproveSkillRoute({ router, logger }: AESOPRouteDependencies) {
  router.versioned
    .post({
      path: '/internal/aesop/skills/{skillId}/improve',
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
            params: buildRouteValidationWithZod(improveSkillParamsSchema),
            body: buildRouteValidationWithZod(improveSkillBodySchema),
          },
        },
      },
      async (context, request, response) => {
        const coreContext = await context.core;
        const evalsContext = await context.evals;
        const esClient = coreContext.elasticsearch.client.asCurrentUser;

        const { skillId } = request.params;
        const { connector_id: connectorId, use_agent: useAgent } = request.body;

        try {
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

          if (!skill.validation?.llm_feedback) {
            return response.badRequest({
              body: { message: 'No validation feedback available. Run validation first.' },
            });
          }

          logger.info(
            `[AESOP] Improving skill skill_id=${skillId} skill_name=${skill.name} mode=${
              useAgent ? 'agent' : 'direct-llm'
            }`
          );

          // Try agent-based improvement if requested
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

                const feedback = [
                  skill.validation?.llm_feedback || '',
                  ...(skill.validation?.weaknesses || []),
                  ...(skill.validation?.suggestions || []),
                ].join('\n');

                const improved = await orchestrator.improveSkill(skill.markdown || '', feedback);

                if (improved?.markdown) {
                  await esClient.update({
                    index: '.aesop-proposed-skills',
                    id: skillId,
                    doc: {
                      name: improved.name || skill.name,
                      description: improved.description || skill.description,
                      markdown: improved.markdown,
                      validation: { status: 'pending' },
                      improvement_history: [
                        ...(skill.improvement_history || []),
                        {
                          improved_at: new Date().toISOString(),
                          improved_by: 'agent',
                          connector_id: connectorId,
                          previous_score: skill.validation?.final_score,
                        },
                      ],
                      last_edited_at: new Date().toISOString(),
                      last_edited_by: 'agent-auto-improve',
                    },
                    refresh: 'wait_for',
                  });

                  // Auto-validate after improvement
                  const { AgentOrchestrator: ValidatorOrchestrator } = await import(
                    '../../lib/aesop/agents/agent_orchestrator'
                  );
                  const validator = new ValidatorOrchestrator({
                    agentBuilderStart,
                    request,
                    connectorId,
                    logger,
                  });

                  const startTime = Date.now();
                  const validationResult = await validator.validateSkill(improved.markdown);
                  if (validationResult) {
                    await esClient.update({
                      index: '.aesop-proposed-skills',
                      id: skillId,
                      doc: {
                        validation: {
                          status: validationResult.passed ? 'passed' : 'failed',
                          final_score: validationResult.score,
                          completed_at: new Date().toISOString(),
                          duration_ms: Date.now() - startTime,
                          criteria: validationResult.criteria,
                          llm_feedback: validationResult.feedback,
                          strengths: validationResult.strengths,
                          weaknesses: validationResult.weaknesses,
                          suggestions: validationResult.suggestions,
                          validated_by: 'agent',
                        },
                      },
                      refresh: 'wait_for',
                    });
                  }

                  return response.ok({
                    body: {
                      success: true,
                      skill_id: skillId,
                      message: `Skill improved and re-validated by agent`,
                      mode: 'agent',
                    },
                  });
                }
              } catch (err) {
                logger.warn(
                  `[AESOP] Agent improvement failed, falling back to direct LLM: ${
                    err instanceof Error ? err.message : String(err)
                  }`
                );
              }
            }
          }

          // Direct LLM improvement (fallback or primary)
          const actionsStart = evalsContext.getActionsStart();
          if (!actionsStart) {
            throw new Error('Actions plugin not available');
          }

          const actionsClient = await actionsStart.getActionsClientWithRequest(request);

          const prompt = buildImprovementPrompt(skill);
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
                      '{ "name": "<improved name>", "description": "<improved description>", "markdown": "<improved full markdown content>" }\n' +
                      'The markdown should be a complete, standalone skill document. ' +
                      'Apply ALL suggestions from the validation feedback. ' +
                      'Keep the same general purpose but make it more specific, actionable, and complete.',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.4,
                    connectorTypeId,
                  })
                ),
              },
            },
          });

          if (result.status === 'error') {
            throw new Error(
              `Connector execution failed: ${result.message} - ${result.serviceMessage}`
            );
          }

          const llmResponse = extractLlmResponseText(result.data);
          const improved = parseImprovedSkill(llmResponse);

          // Save improved skill and set to validating (will auto-validate)
          await esClient.update({
            index: '.aesop-proposed-skills',
            id: skillId,
            doc: {
              name: improved.name,
              description: improved.description,
              markdown: improved.markdown,
              validation: {
                status: 'validating',
                started_at: new Date().toISOString(),
                connector_id: connectorId,
              },
              improvement_history: [
                ...(skill.improvement_history || []),
                {
                  improved_at: new Date().toISOString(),
                  improved_by: 'llm',
                  connector_id: connectorId,
                  previous_score: skill.validation?.final_score,
                  feedback_applied: skill.validation?.llm_feedback,
                },
              ],
              last_edited_at: new Date().toISOString(),
              last_edited_by: 'llm-auto-improve',
            },
            refresh: 'wait_for',
          });

          logger.info(`[AESOP] Skill improved, starting auto-validation skill_id=${skillId}`);

          // Fire-and-forget: validate the improved skill
          autoValidateImprovedSkill({
            esClient,
            actionsClient,
            connectorId,
            skillId,
            improvedSkill: improved,
            logger,
          }).catch((err) => {
            logger.error(
              `[AESOP] Auto-validation after improvement failed skill_id=${skillId}: ${
                err instanceof Error ? err.message : String(err)
              }`
            );
          });

          return response.ok({
            body: {
              success: true,
              skill_id: skillId,
              improved: {
                name: improved.name,
                description: improved.description,
              },
              auto_validation_triggered: true,
            },
          });
        } catch (error) {
          logger.error(
            `[AESOP] Failed to improve skill skill_id=${skillId}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );

          return response.customError({
            statusCode: 500,
            body: {
              message: `Failed to improve skill: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          });
        }
      }
    );
}

function buildImprovementPrompt(skill: ProposedSkillDocument): string {
  return `Improve this Agent Builder skill based on the validation feedback below.

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

${
  skill.validation?.criteria
    ? `**Criteria Scores:**
- Relevance: ${((skill.validation.criteria.relevance || 0) * 100).toFixed(0)}%
- Completeness: ${((skill.validation.criteria.completeness || 0) * 100).toFixed(0)}%
- Accuracy: ${((skill.validation.criteria.accuracy || 0) * 100).toFixed(0)}%
- Specificity: ${((skill.validation.criteria.specificity || 0) * 100).toFixed(0)}%
- Safety: ${((skill.validation.criteria.safety || 0) * 100).toFixed(0)}%`
    : ''
}

## Discovery Context
- Source Indices: ${JSON.stringify(
    skill.source?.source_indices || skill.metadata?.source_indices || []
  )}
- Pattern Frequency: ${skill.source?.pattern_frequency || 'unknown'}
- Rationale: ${skill.source?.rationale || 'N/A'}

Apply all suggestions and fix all weaknesses. Make the skill specific, actionable, and complete.
Return the improved skill as JSON: { "name": "...", "description": "...", "markdown": "..." }`;
}

function parseImprovedSkill(response: string): {
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
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    return {
      name: String(parsed.name ?? 'Improved Skill'),
      description: String(parsed.description ?? ''),
      markdown: String(parsed.markdown ?? ''),
    };
  } catch {
    return {
      name: 'Improved Skill',
      description: '',
      markdown: response,
    };
  }
}

/**
 * After improving a skill, automatically validate it so the user sees
 * the updated score without an extra click.
 */
async function autoValidateImprovedSkill({
  esClient,
  actionsClient,
  connectorId,
  skillId,
  improvedSkill,
  logger,
}: {
  esClient: ElasticsearchClient;
  actionsClient: ActionsClient;
  connectorId: string;
  skillId: string;
  improvedSkill: { name: string; description: string; markdown: string };
  logger: Logger;
}) {
  const startTime = Date.now();
  const evalTraceId = `aesop-eval-${skillId}-${Date.now()}`;

  const systemPrompt =
    'You are an expert skill evaluator for a security operations platform. ' +
    'Evaluate the proposed Agent Builder skill across these criteria:\n' +
    '1. **Relevance** (0-1): Is this skill useful for security analysts?\n' +
    '2. **Completeness** (0-1): Does the skill content provide enough detail for an AI agent to execute it?\n' +
    '3. **Accuracy** (0-1): Are the described patterns/queries correct for the data sources?\n' +
    '4. **Specificity** (0-1): Is the skill specific enough to be actionable (not too generic)?\n' +
    '5. **Safety** (0-1): Does the skill avoid dangerous operations (write/delete/modify data)?\n\n' +
    'Respond with ONLY a JSON object (no markdown fences):\n' +
    '{ "score": <weighted average 0.0-1.0>, "passed": <true if score >= 0.85>, ' +
    '"criteria": { "relevance": <0-1>, "completeness": <0-1>, "accuracy": <0-1>, "specificity": <0-1>, "safety": <0-1> }, ' +
    '"feedback": "<detailed 2-3 sentence summary>", ' +
    '"strengths": ["..."], "weaknesses": ["..."], "suggestions": ["..."] }';

  const userPrompt = `Evaluate this Agent Builder skill:\n\n## ${improvedSkill.name}\n${improvedSkill.description}\n\n${improvedSkill.markdown}`;

  try {
    const connectorTypeId = await getConnectorTypeId(actionsClient, connectorId);
    const result = await actionsClient.execute({
      actionId: connectorId,
      params: {
        subAction: 'run',
        subActionParams: {
          body: JSON.stringify(
            buildLlmRequestBody({
              system: systemPrompt,
              messages: [{ role: 'user', content: userPrompt }],
              temperature: 0.3,
              connectorTypeId,
            })
          ),
        },
      },
    });

    if (result.status === 'error') {
      throw new Error(`${result.message} - ${result.serviceMessage}`);
    }

    const rawResponse = extractLlmResponseText(result.data);
    const evaluation = parseEvaluation(rawResponse);
    const durationMs = Date.now() - startTime;

    await esClient.update({
      index: '.aesop-proposed-skills',
      id: skillId,
      doc: {
        validation: {
          status: evaluation.passed ? 'passed' : 'failed',
          final_score: evaluation.score,
          completed_at: new Date().toISOString(),
          connector_id: connectorId,
          eval_trace_id: evalTraceId,
          duration_ms: durationMs,
          criteria: evaluation.criteria,
          llm_feedback: evaluation.feedback,
          strengths: evaluation.strengths,
          weaknesses: evaluation.weaknesses,
          suggestions: evaluation.suggestions,
          llm_raw_response: rawResponse,
          iterations: [{ score: evaluation.score, iteration: 1 }],
        },
      },
      refresh: 'wait_for',
    });

    logger.info(
      `[AESOP] Auto-validation complete skill_id=${skillId} score=${evaluation.score} passed=${evaluation.passed} duration_ms=${durationMs}`
    );
  } catch (error) {
    await esClient
      .update({
        index: '.aesop-proposed-skills',
        id: skillId,
        doc: {
          validation: {
            status: 'failed',
            completed_at: new Date().toISOString(),
            error: error instanceof Error ? error.message : String(error),
          },
        },
        refresh: 'wait_for',
      })
      .catch((markFailedErr: unknown) => {
        logger.warn(
          `[AESOP] Failed to mark skill as failed after auto-validation: ${
            markFailedErr instanceof Error ? markFailedErr.message : String(markFailedErr)
          }`
        );
      });
  }
}

function parseEvaluation(response: string) {
  const defaults = {
    score: 0.5,
    passed: false,
    criteria: { relevance: 0, completeness: 0, accuracy: 0, specificity: 0, safety: 0 },
    feedback: 'Unable to parse',
    strengths: [] as string[],
    weaknesses: [] as string[],
    suggestions: [] as string[],
  };
  try {
    let cleaned = response.replace(/<think>[\s\S]*?<\/think>/g, '');
    cleaned = cleaned
      .replace(/```json?\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    if (!cleaned.startsWith('{')) {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) cleaned = m[0];
    }
    const p = JSON.parse(cleaned);
    return {
      score: Math.max(0, Math.min(1, Number(p.score) || 0.5)),
      passed: p.passed ?? Number(p.score) >= 0.85,
      criteria: {
        relevance: Number(p.criteria?.relevance) || 0,
        completeness: Number(p.criteria?.completeness) || 0,
        accuracy: Number(p.criteria?.accuracy) || 0,
        specificity: Number(p.criteria?.specificity) || 0,
        safety: Number(p.criteria?.safety) || 0,
      },
      feedback: String(p.feedback || defaults.feedback),
      strengths: Array.isArray(p.strengths) ? p.strengths : [],
      weaknesses: Array.isArray(p.weaknesses) ? p.weaknesses : [],
      suggestions: Array.isArray(p.suggestions) ? p.suggestions : [],
    };
  } catch {
    const m = response.match(/"score"\s*:\s*([\d.]+)/);
    if (m) return { ...defaults, score: Number(m[1]), passed: Number(m[1]) >= 0.85 };
    return defaults;
  }
}
