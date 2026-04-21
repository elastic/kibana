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
  eval_summary: z
    .object({
      meanScore: z.number(),
      passRate: z.number(),
      examplesRan: z.number(),
    })
    .optional(),
  evaluator_scores: z
    .array(
      z.object({
        name: z.string(),
        meanScore: z.number(),
        passCount: z.number(),
        failCount: z.number(),
      })
    )
    .optional(),
  // Alternative input: AESOP findings (used when no eval has been run)
  aesop_weaknesses: z.array(z.string()).optional(),
  aesop_suggestions: z.array(z.string()).optional(),
});

export function registerSkillGenerateImprovementRoute({ router, logger }: SkillRouteDependencies) {
  router.versioned
    .post({
      path: '/internal/evals/skills/{skillId}/generate-improvement',
      access: 'internal',
      security: { authz: { requiredPrivileges: ['evals'] } },
      options: { timeout: { idleSocket: 120_000 } },
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
          aesop_weaknesses: aesopWeaknesses,
          aesop_suggestions: aesopSuggestions,
        } = request.body;
        const evalsContext = await context.evals;

        try {
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

          const actionsStart = evalsContext.getActionsStart();
          if (!actionsStart) {
            return response.badRequest({
              body: { message: 'Actions plugin not available' },
            });
          }
          const actionsClient = await actionsStart.getActionsClientWithRequest(request);

          const prompt = buildGenerateImprovementPrompt({
            skillName: skill.name,
            skillDescription: skill.description,
            skillContent: skill.content,
            evalSummary,
            evaluatorScores,
            aesopWeaknesses,
            aesopSuggestions,
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
                      'You are an expert at improving Agent Builder skills for security operations. ' +
                      'Given a skill and its evaluation feedback, produce an improved version that addresses all weaknesses. ' +
                      'Respond with ONLY a JSON object (no markdown fences):\n' +
                      '{ "improved_name": "<improved name>", "improved_description": "<improved description>", ' +
                      '"improved_content": "<full improved markdown content>", ' +
                      '"changes_summary": "<2-3 sentence summary of what was changed and why>", ' +
                      '"suggestions": ["<specific change 1>", "<specific change 2>", ...] }\n' +
                      'The improved_content must be a complete, standalone skill document. ' +
                      'Apply ALL improvements needed to fix failing evaluators and raise low scores.',
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

          const parsed = parseImprovedSkillResponse(extractLlmResponseText(result.data));

          return response.ok({ body: parsed });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          logger.error(`[Evals] Failed to generate improvement for skill: ${msg}`);
          return response.customError({ statusCode: 500, body: { message: msg } });
        }
      }
    );
}

const buildGenerateImprovementPrompt = ({
  skillName,
  skillDescription,
  skillContent,
  evalSummary,
  evaluatorScores,
  aesopWeaknesses,
  aesopSuggestions,
}: {
  skillName: string;
  skillDescription: string;
  skillContent: string;
  evalSummary?: { meanScore: number; passRate: number; examplesRan: number };
  evaluatorScores?: Array<{
    name: string;
    meanScore: number;
    passCount: number;
    failCount: number;
  }>;
  aesopWeaknesses?: string[];
  aesopSuggestions?: string[];
}): string => {
  let prompt = `Improve this Agent Builder skill based on the feedback provided.

## Current Skill
**Name:** ${skillName}
**Description:** ${skillDescription}

**Current Content:**
${skillContent}
`;

  // Eval-based feedback
  if (evalSummary && evaluatorScores?.length) {
    const sorted = [...evaluatorScores].sort((a, b) => a.meanScore - b.meanScore);
    const failed = sorted.filter((e) => e.failCount > 0);
    const lowScore = sorted.filter((e) => e.meanScore < 0.8 && e.failCount === 0);

    prompt += `
## Evaluation Results
- **Mean Score:** ${evalSummary.meanScore.toFixed(2)}
- **Pass Rate:** ${(evalSummary.passRate * 100).toFixed(0)}%
- **Examples Evaluated:** ${evalSummary.examplesRan}
`;

    if (failed.length > 0) {
      prompt += `\n### FAILED Evaluators (must fix)\n`;
      for (const e of failed) {
        prompt += `- **${e.name}**: score ${e.meanScore.toFixed(2)}, ${e.passCount} passed, ${
          e.failCount
        } failed\n`;
      }
    }

    if (lowScore.length > 0) {
      prompt += `\n### LOW SCORE Evaluators (should improve)\n`;
      for (const e of lowScore) {
        prompt += `- **${e.name}**: score ${e.meanScore.toFixed(2)}, ${e.passCount} passed\n`;
      }
    }

    const passing = sorted.filter((e) => e.meanScore >= 0.8 && e.failCount === 0);
    if (passing.length > 0) {
      prompt += `\n### Passing Evaluators (maintain quality)\n`;
      for (const e of passing) {
        prompt += `- **${e.name}**: score ${e.meanScore.toFixed(2)}\n`;
      }
    }
  }

  // AESOP-based feedback (used when no eval has been run)
  if (aesopWeaknesses?.length || aesopSuggestions?.length) {
    prompt += `\n## AESOP Analysis Findings\n`;
    if (aesopWeaknesses?.length) {
      prompt += `\n### Weaknesses (must address)\n`;
      for (const w of aesopWeaknesses) {
        prompt += `- ${w}\n`;
      }
    }
    if (aesopSuggestions?.length) {
      prompt += `\n### Suggested Improvements\n`;
      for (const s of aesopSuggestions) {
        prompt += `- ${s}\n`;
      }
    }
  }

  prompt += `
## Instructions
1. Address ALL identified weaknesses and issues first
2. Apply all suggested improvements
3. Keep the skill focused, actionable, and specific
4. Use correct data stream names (not backing indices)
5. Include valid ES|QL examples where relevant
6. Maintain what's already working well
7. Do not include hard-coded PII

Return the improved skill as JSON with improved_name, improved_description, improved_content, changes_summary, and suggestions.`;

  return prompt;
};

const parseImprovedSkillResponse = (
  raw: string
): {
  improved_name: string;
  improved_description: string;
  improved_content: string;
  changes_summary: string;
  suggestions: string[];
} => {
  const defaults = {
    improved_name: '',
    improved_description: '',
    improved_content: '',
    changes_summary: 'Unable to generate improvement.',
    suggestions: [] as string[],
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
      improved_name: String(parsed.improved_name || parsed.name || defaults.improved_name),
      improved_description: String(
        parsed.improved_description || parsed.description || defaults.improved_description
      ),
      improved_content: String(
        parsed.improved_content || parsed.markdown || defaults.improved_content
      ),
      changes_summary: String(parsed.changes_summary || defaults.changes_summary),
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.map(String) : [],
    };
  } catch {
    return { ...defaults, improved_content: raw.slice(0, 5000) };
  }
};
