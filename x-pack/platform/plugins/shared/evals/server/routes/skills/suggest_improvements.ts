/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/evals-common';
import type { SkillRouteDependencies } from '.';
import {
  buildLlmRequestBody,
  extractLlmResponseText,
  getConnectorTypeId,
} from '../../lib/aesop/llm_defaults';

const paramsSchema = z.object({ skillId: z.string() });

const bodySchema = z.object({
  connector_id: z.string().min(1),
  eval_summary: z.object({
    meanScore: z.number(),
    passRate: z.number(),
    examplesRan: z.number(),
  }),
  evaluator_scores: z.array(
    z.object({
      name: z.string(),
      meanScore: z.number(),
      passCount: z.number(),
      failCount: z.number(),
    })
  ),
});

export function registerSkillSuggestImprovementsRoute({ router, logger }: SkillRouteDependencies) {
  router.versioned
    .post({
      path: '/internal/evals/skills/{skillId}/suggest-improvements',
      access: 'internal',
      security: { authz: { requiredPrivileges: ['evals'] } },
      options: { timeout: { idleSocket: 60_000 } },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(paramsSchema),
            body: buildRouteValidationWithZod(bodySchema),
          },
        },
      },
      async (context, request, response) => {
        const { skillId } = request.params;
        const {
          connector_id: connectorId,
          eval_summary: evalSummary,
          evaluator_scores: evaluatorScores,
        } = request.body;
        const evalsContext = await context.evals;

        try {
          // Load skill from Agent Builder registry
          const agentBuilderStart = await evalsContext.getAgentBuilderStart();
          if (!agentBuilderStart) {
            return response.badRequest({
              body: { message: 'Agent Builder plugin not available' },
            });
          }

          const skillRegistry = await agentBuilderStart.skills.getRegistry({ request });
          const skill = await skillRegistry.get(skillId);
          if (!skill) {
            return response.notFound({
              body: { message: `Skill ${skillId} not found` },
            });
          }

          // Get actions client for LLM call
          const actionsStart = evalsContext.getActionsStart();
          if (!actionsStart) {
            return response.badRequest({
              body: { message: 'Actions plugin not available' },
            });
          }
          const actionsClient = await actionsStart.getActionsClientWithRequest(request);

          // Build the analysis prompt
          const prompt = buildSuggestImprovementsPrompt({
            skillName: skill.name,
            skillDescription: skill.description,
            skillContent: skill.content,
            evalSummary,
            evaluatorScores,
          });
          const connectorTypeId = await getConnectorTypeId(actionsClient, connectorId);

          const result = await actionsClient.execute({
            actionId: connectorId,
            params: {
              subAction: 'run',
              subActionParams: {
                body: JSON.stringify(
                  buildLlmRequestBody({
                    system:
                      'You are an expert at analyzing Agent Builder skill evaluation results. ' +
                      'Given a skill and its evaluation scores, identify weaknesses and suggest specific, actionable improvements. ' +
                      'Respond with ONLY a JSON object (no markdown fences):\n' +
                      '{ "analysis": "<2-3 sentence overall assessment>", ' +
                      '"weaknesses": ["<specific weakness 1>", ...], ' +
                      '"suggestions": ["<actionable improvement 1>", ...], ' +
                      '"focus_areas": ["<evaluator name that needs most attention>", ...] }',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.3,
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

          const parsed = parseSuggestionsResponse(extractLlmResponseText(result.data));

          return response.ok({ body: parsed });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          logger.error(`[Evals] Failed to suggest improvements for skill: ${msg}`);
          return response.customError({ statusCode: 500, body: { message: msg } });
        }
      }
    );
}

const buildSuggestImprovementsPrompt = ({
  skillName,
  skillDescription,
  skillContent,
  evalSummary,
  evaluatorScores,
}: {
  skillName: string;
  skillDescription: string;
  skillContent: string;
  evalSummary: { meanScore: number; passRate: number; examplesRan: number };
  evaluatorScores: Array<{
    name: string;
    meanScore: number;
    passCount: number;
    failCount: number;
  }>;
}): string => {
  const sorted = [...evaluatorScores].sort((a, b) => a.meanScore - b.meanScore);
  const failed = sorted.filter((e) => e.failCount > 0);
  const lowScore = sorted.filter((e) => e.meanScore < 0.8 && e.failCount === 0);

  let prompt = `Analyze this Agent Builder skill's evaluation results and suggest improvements.

## Skill
**Name:** ${skillName}
**Description:** ${skillDescription}

**Content:**
${skillContent}

## Evaluation Summary
- **Mean Score:** ${evalSummary.meanScore.toFixed(2)}
- **Pass Rate:** ${(evalSummary.passRate * 100).toFixed(0)}%
- **Examples Evaluated:** ${evalSummary.examplesRan}

## Per-Evaluator Scores
`;

  if (failed.length > 0) {
    prompt += `\n### Evaluators with Failures\n`;
    for (const e of failed) {
      prompt += `- **${e.name}**: score ${e.meanScore.toFixed(2)}, ${e.passCount} passed, ${
        e.failCount
      } failed\n`;
    }
  }

  if (lowScore.length > 0) {
    prompt += `\n### Low-Score Evaluators (< 0.8)\n`;
    for (const e of lowScore) {
      prompt += `- **${e.name}**: score ${e.meanScore.toFixed(2)}, ${e.passCount} passed\n`;
    }
  }

  const passing = sorted.filter((e) => e.meanScore >= 0.8 && e.failCount === 0);
  if (passing.length > 0) {
    prompt += `\n### Passing Evaluators\n`;
    for (const e of passing) {
      prompt += `- **${e.name}**: score ${e.meanScore.toFixed(2)}\n`;
    }
  }

  prompt += `\nIdentify what's weak in this skill based on the failing/low-score evaluators. Suggest specific, actionable improvements to the skill content that would address those weaknesses.`;

  return prompt;
};

const parseSuggestionsResponse = (
  raw: string
): {
  analysis: string;
  weaknesses: string[];
  suggestions: string[];
  focus_areas: string[];
} => {
  const defaults = {
    analysis: 'Unable to generate analysis.',
    weaknesses: [] as string[],
    suggestions: [] as string[],
    focus_areas: [] as string[],
  };

  try {
    let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, '');
    cleaned = cleaned
      .replace(/```json?\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    if (!cleaned.startsWith('{')) {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) cleaned = m[0];
    }

    const parsed = JSON.parse(cleaned);
    return {
      analysis: String(parsed.analysis || defaults.analysis),
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.map(String) : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.map(String) : [],
      focus_areas: Array.isArray(parsed.focus_areas) ? parsed.focus_areas.map(String) : [],
    };
  } catch {
    return { ...defaults, analysis: raw.slice(0, 500) };
  }
};
