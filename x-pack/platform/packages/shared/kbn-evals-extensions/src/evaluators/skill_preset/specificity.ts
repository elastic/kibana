/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';

export const SKILL_SPECIFICITY_PROMPT = `You are evaluating an Agent Builder skill for specificity and actionability.

## Skill to evaluate
Name: {name}
Description: {description}
Content:
{markdown}

## Scoring criteria
Rate this skill from 0.0 to 1.0 on SPECIFICITY:
- 1.0: Provides exact ES|QL queries ready to run, specific field names, concrete thresholds or conditions, and clear decision criteria for the analyst
- 0.7-0.9: Mostly specific with minor areas left to the analyst's judgment (e.g., "adjust the time range as needed")
- 0.4-0.6: Mix of specific and generic guidance — some concrete examples but also vague directives like "investigate further"
- 0.0-0.3: Entirely generic advice that could apply to any situation (e.g., "check the logs", "look for anomalies")

A highly specific skill enables a junior analyst to follow it step-by-step without needing to improvise.

Respond with JSON only:
{"score": <number>, "explanation": "<reasoning>"}`;

export const createSkillSpecificityEvaluator = (): Evaluator => ({
  name: 'skill-specificity',
  kind: 'LLM',
  evaluate: async ({ input, output }) => {
    const skillContent = typeof output === 'string' ? output : JSON.stringify(output);
    const inputRecord = input as Record<string, unknown> | undefined;
    const prompt = SKILL_SPECIFICITY_PROMPT.replace('{name}', String(inputRecord?.name ?? ''))
      .replace('{description}', String(inputRecord?.description ?? ''))
      .replace('{markdown}', skillContent);

    return {
      score: null,
      label: 'pending',
      explanation: 'LLM evaluation pending',
      metadata: { prompt, evaluatorKind: 'LLM', feedbackKey: 'specificity' },
    };
  },
});
