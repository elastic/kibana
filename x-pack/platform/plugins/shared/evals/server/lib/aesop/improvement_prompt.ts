/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProposedSkillDocument, SkillEvaluatorResult } from './types';

export const buildImprovementPrompt = (
  skill: ProposedSkillDocument,
  evaluatorResults: SkillEvaluatorResult[]
): string => {
  const sorted = [...evaluatorResults].sort((a, b) => {
    if (!a.pass && b.pass) return -1;
    if (a.pass && !b.pass) return 1;
    return (a.score ?? 0) - (b.score ?? 0);
  });

  const failedEvaluators = sorted.filter((r) => !r.pass);
  const lowScoreEvaluators = sorted.filter((r) => r.pass && (r.score ?? 0) < 0.8);

  let prompt = `You are improving an Agent Builder skill based on evaluation feedback.

## Current Skill
Name: ${skill.name}
Description: ${skill.description}

## Current Content
${skill.markdown}

## Evaluation Feedback — Fix These Issues\n\n`;

  if (failedEvaluators.length > 0) {
    prompt += `### FAILED Evaluators (must fix)\n`;
    for (const r of failedEvaluators) {
      prompt += `- **${r.evaluator}** (${r.kind}, score: ${r.score ?? 'null'}): ${
        r.explanation ?? 'No explanation'
      }\n`;
    }
    prompt += '\n';
  }

  if (lowScoreEvaluators.length > 0) {
    prompt += `### LOW SCORE Evaluators (should improve)\n`;
    for (const r of lowScoreEvaluators) {
      prompt += `- **${r.evaluator}** (${r.kind}, score: ${
        r.score != null ? r.score.toFixed(2) : 'null'
      }): ${r.explanation ?? 'No explanation'}\n`;
    }
    prompt += '\n';
  }

  prompt += `## Instructions
1. Fix ALL failed evaluator issues first (these are blocking)
2. Then improve low-score areas
3. Keep the skill focused and actionable
4. Use correct data stream names (not backing indices)
5. Include valid ES|QL examples
6. Do not include hard-coded PII

Return the improved skill in this JSON format:
{"name": "...", "description": "...", "markdown": "..."}`;

  return prompt;
};
