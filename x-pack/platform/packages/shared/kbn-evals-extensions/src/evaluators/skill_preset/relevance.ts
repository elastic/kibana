/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';

export const SKILL_RELEVANCE_PROMPT = `You are evaluating an Agent Builder skill for security operations relevance.

## Skill to evaluate
Name: {name}
Description: {description}
Content:
{markdown}

## Scoring criteria
Rate this skill from 0.0 to 1.0 on RELEVANCE:
- 1.0: Directly addresses a common SOC/security analyst workflow (alert triage, threat hunting, incident response)
- 0.7-0.9: Useful for security operations but not a core workflow
- 0.4-0.6: Tangentially related to security
- 0.0-0.3: Not relevant to security operations

Respond with JSON only:
{"score": <number>, "explanation": "<reasoning>"}`;

export const createSkillRelevanceEvaluator = (): Evaluator => ({
  name: 'skill-relevance',
  kind: 'LLM',
  evaluate: async ({ input, output }) => {
    const skillContent = typeof output === 'string' ? output : JSON.stringify(output);
    const inputRecord = input as Record<string, unknown> | undefined;
    const prompt = SKILL_RELEVANCE_PROMPT.replace('{name}', String(inputRecord?.name ?? ''))
      .replace('{description}', String(inputRecord?.description ?? ''))
      .replace('{markdown}', skillContent);

    return {
      score: null,
      label: 'pending',
      explanation: 'LLM evaluation pending',
      metadata: { prompt, evaluatorKind: 'LLM', feedbackKey: 'relevance' },
    };
  },
});
