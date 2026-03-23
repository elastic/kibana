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

const runSkillValidationParamsSchema = z.object({
  skillId: z.string(),
});

const runSkillValidationBodySchema = z.object({
  connector_id: z.string().min(1),
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
        const { connector_id: connectorId } = request.body;

        try {
          // 1. Load skill
          const skillDoc = await esClient.get({
            index: '.aesop-proposed-skills',
            id: skillId,
          });

          // TODO: Replace with a proper ProposedSkill type when moving beyond spike
          const skill = skillDoc._source as any;

          logger.info('[AESOP] Starting LLM-based skill validation', {
            skill_id: skillId,
            skill_name: skill.name,
            connector_id: connectorId,
          });

          // 2. Mark as validating
          await esClient.update({
            index: '.aesop-proposed-skills',
            id: skillId,
            body: {
              doc: {
                validation: {
                  status: 'validating',
                  started_at: new Date().toISOString(),
                  connector_id: connectorId,
                },
              },
            },
          });

          // 3. Get actions client for LLM execution
          const actionsStart = evalsContext.getActionsStart();
          if (!actionsStart) {
            throw new Error('Actions plugin not available — cannot execute LLM connector');
          }

          const actionsClient = await actionsStart.getActionsClientWithRequest(request);

          // 4. Run LLM validation asynchronously
          runLLMValidation({
            esClient,
            actionsClient,
            connectorId,
            skillId,
            skill,
            logger,
          }).catch((err) => {
            logger.error('[AESOP] Background LLM validation failed', {
              error: err instanceof Error ? err.message : String(err),
              skill_id: skillId,
            });
          });

          return response.ok({
            body: {
              success: true,
              skill_id: skillId,
              skill_name: skill.name,
              status: 'validating',
              message: `LLM validation started for skill: ${skill.name}`,
            },
          });
        } catch (error) {
          logger.error('[AESOP] Failed to start validation', { error, skill_id: skillId });

          // Revert skill status on setup failure
          await esClient
            .update({
              index: '.aesop-proposed-skills',
              id: skillId,
              body: { doc: { validation: { status: 'pending' } } },
            })
            .catch(() => {});

          return response.customError({
            statusCode: 500,
            body: {
              message: `Failed to start validation: ${error instanceof Error ? error.message : String(error)}`,
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
  actionsClient: { execute: (opts: Record<string, unknown>) => Promise<Record<string, unknown>> };
  connectorId: string;
  skillId: string;
  skill: Record<string, any>;
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

    logger.info('[AESOP] LLM validation completed', {
      skill_id: skillId,
      score: evaluation.score,
      passed: evaluation.passed,
      duration_ms: durationMs,
      eval_trace_id: evalTraceId,
    });

    // Update skill with validation results
    await esClient.update({
      index: '.aesop-proposed-skills',
      id: skillId,
      body: {
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
      },
      refresh: 'wait_for',
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;

    logger.error('[AESOP] LLM validation failed', {
      error: error instanceof Error ? error.message : String(error),
      skill_id: skillId,
      duration_ms: durationMs,
    });

    // Mark as failed — preserve previous score if it exists
    await esClient
      .update({
        index: '.aesop-proposed-skills',
        id: skillId,
        body: {
          doc: {
            validation: {
              status: 'failed',
              completed_at: new Date().toISOString(),
              duration_ms: durationMs,
              error: error instanceof Error ? error.message : String(error),
            },
          },
        },
        refresh: 'wait_for',
      })
      .catch(() => {});
  }
}

function buildValidationPrompt(skill: any): string {
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
- Source Indices: ${JSON.stringify(skill.source?.source_indices || skill.metadata?.source_indices || [])}

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
    relevance: 0, completeness: 0, accuracy: 0, specificity: 0, safety: 0,
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
      passed: parsed.passed ?? (Number(parsed.score) >= 0.85),
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
