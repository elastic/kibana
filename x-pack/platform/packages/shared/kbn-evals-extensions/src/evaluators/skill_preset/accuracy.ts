/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';

export const SKILL_ACCURACY_PROMPT = `You are evaluating an Agent Builder skill for technical accuracy.

## Skill to evaluate
Name: {name}
Description: {description}
Content:
{markdown}

## Scoring criteria
Rate this skill from 0.0 to 1.0 on ACCURACY:
- 1.0: All ES|QL queries use correct syntax, all field references match Elastic Common Schema (ECS) or known data source schemas, index patterns are valid, and API references are correct
- 0.7-0.9: Minor inaccuracies (e.g., a deprecated field name) but core queries and references are correct
- 0.4-0.6: Some queries have syntax errors or use non-existent fields, but the overall approach is sound
- 0.0-0.3: Major inaccuracies — broken queries, wrong field names, or incorrect API usage that would fail at runtime

Pay special attention to:
1. ES|QL command syntax (FROM, WHERE, STATS, EVAL, SORT, LIMIT, KEEP, DROP, RENAME, DISSECT, GROK, ENRICH)
2. Field names matching ECS conventions (e.g., process.name, host.name, source.ip)
3. Index patterns following Elastic conventions (e.g., logs-*, .alerts-security.alerts-*)
4. Correct use of ES|QL functions and operators

Respond with JSON only:
{"score": <number>, "explanation": "<reasoning>"}`;

export const createSkillAccuracyEvaluator = (): Evaluator => ({
  name: 'skill-accuracy',
  kind: 'LLM',
  evaluate: async ({ input, output }) => {
    const skillContent = typeof output === 'string' ? output : JSON.stringify(output);
    const inputRecord = input as Record<string, unknown> | undefined;
    const prompt = SKILL_ACCURACY_PROMPT.replace('{name}', String(inputRecord?.name ?? ''))
      .replace('{description}', String(inputRecord?.description ?? ''))
      .replace('{markdown}', skillContent);

    return {
      score: null,
      label: 'pending',
      explanation: 'LLM evaluation pending',
      metadata: { prompt, evaluatorKind: 'LLM', feedbackKey: 'accuracy' },
    };
  },
});
