/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';

export const SKILL_COMPLETENESS_PROMPT = `You are evaluating an Agent Builder skill for completeness.

## Skill to evaluate
Name: {name}
Description: {description}
Content:
{markdown}

## Scoring criteria
Rate this skill from 0.0 to 1.0 on COMPLETENESS:
- 1.0: Has step-by-step instructions, ES|QL examples with correct syntax, specific data source references (e.g., logs-endpoint.events.process-*), expected output descriptions, and error handling guidance
- 0.7-0.9: Has most key elements but missing one of: ES|QL examples, data source references, or error handling
- 0.4-0.6: Has basic structure but missing multiple critical elements
- 0.0-0.3: Skeletal or stub content with no actionable instructions

Respond with JSON only:
{"score": <number>, "explanation": "<reasoning>"}`;

export const createSkillCompletenessEvaluator = (): Evaluator => ({
  name: 'skill-completeness',
  kind: 'LLM',
  evaluate: async ({ input, output }) => {
    const skillContent = typeof output === 'string' ? output : JSON.stringify(output);
    const inputRecord = input as Record<string, unknown> | undefined;
    const prompt = SKILL_COMPLETENESS_PROMPT.replace('{name}', String(inputRecord?.name ?? ''))
      .replace('{description}', String(inputRecord?.description ?? ''))
      .replace('{markdown}', skillContent);

    return {
      score: null,
      label: 'pending',
      explanation: 'LLM evaluation pending',
      metadata: { prompt, evaluatorKind: 'LLM', feedbackKey: 'completeness' },
    };
  },
});
