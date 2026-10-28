/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, EvaluationResult } from '@kbn/evals';
import type { AutomaticImportExample } from './dataset';
import type { ExtraFieldJudge } from './extra_field_judge';
import type { EcsFields } from './scoring/ecs_fields';
import { CATEGORIZATION_FIELDS } from './scoring/field_rules';
import type { RunScore } from './scoring/score_run';
import { f1, precision, recall, scoreRun } from './scoring/score_run';
import type { AutomaticImportRunOutput } from './types';

type AutomaticImportEvaluator = Evaluator<AutomaticImportExample, AutomaticImportRunOutput>;

const MAX_MISPLACED_IN_EXPLANATION = 5;

/**
 * Pass `judge` for scores that count generated fields the reference doesn't set; without it
 * those fields are left out of the result, which recall and run success don't use.
 */
const createScoreEvaluator = (
  name: string,
  ecsFields: EcsFields,
  toResult: (score: RunScore, output: AutomaticImportRunOutput) => EvaluationResult,
  judge?: ExtraFieldJudge
): AutomaticImportEvaluator => ({
  name,
  kind: judge ? 'LLM' : 'CODE',
  direction: 'maximize',
  ...(judge && { getModel: judge.getModel }),
  evaluate: async ({ input, output, expected }) => {
    if (!expected) {
      return { score: null, explanation: 'Example has no expected output' };
    }
    // The evals framework aborts the whole experiment when an evaluator throws.
    const judged: { correctExtras: ReadonlySet<string> } | { error: unknown } = judge
      ? await judge.judgeExtraFields({ input, output, expected }).then(
          (correctExtras) => ({ correctExtras }),
          (error: unknown) => ({ error })
        )
      : { correctExtras: new Set() };
    if ('error' in judged) {
      return { score: null, label: 'judge_failed', explanation: `judge failed: ${judged.error}` };
    }
    return toResult(scoreRun(output, expected, ecsFields, judged.correctExtras), output);
  },
});

const describeRecallAndPrecision = (score: RunScore): string =>
  `recall ${recall(score).toFixed(2)}, precision ${precision(score).toFixed(2)}`;

const describeMisplaced = ({ misplaced }: RunScore): string =>
  misplaced.length === 0
    ? ''
    : `; value found under a different field: ${misplaced
        .slice(0, MAX_MISPLACED_IN_EXPLANATION)
        .map(
          ({ expectedField, foundField, count }) => `${expectedField} -> ${foundField} (${count})`
        )
        .join(', ')}`;

const pickFields = (ecsFields: EcsFields, names: readonly string[]): EcsFields =>
  new Map([...ecsFields].filter(([name]) => names.includes(name)));

/** ECS F1, recall, and precision, categorization F1, and run success for one data stream. */
export const createAutomaticImportEvaluators = (
  ecsFields: EcsFields,
  judge: ExtraFieldJudge
): AutomaticImportEvaluator[] => [
  createScoreEvaluator(
    'ECS F1',
    ecsFields,
    (score) => ({ score: f1(score), explanation: describeRecallAndPrecision(score) }),
    judge
  ),
  createScoreEvaluator(
    'Categorization F1',
    pickFields(ecsFields, CATEGORIZATION_FIELDS),
    (score) => ({ score: f1(score), explanation: describeRecallAndPrecision(score) }),
    judge
  ),
  createScoreEvaluator('ECS recall', ecsFields, (score) => ({
    score: recall(score),
    explanation: `${score.matchedExpectedFields}/${
      score.expectedFields
    } expected ECS fields matched${describeMisplaced(score)}`,
    metadata: { misplaced: score.misplaced },
  })),
  createScoreEvaluator(
    'ECS precision',
    ecsFields,
    (score) => ({
      score: precision(score),
      explanation: `${score.matchedGeneratedFields}/${score.generatedFields} generated ECS fields correct, including ${score.correctExtraFields}/${score.extraFields} that the reference doesn't set`,
    }),
    judge
  ),
  createScoreEvaluator('Run success', ecsFields, (score, { status, error }) => {
    if (status !== 'completed') {
      return {
        score: 0,
        label: status,
        explanation: `analysis failed: ${error ?? 'unknown error'}`,
      };
    }
    // The agent falls back to a boilerplate pipeline when it gives up, which parses but maps nothing.
    if (score.generatedFields === 0) {
      return { score: 0, label: 'no_ecs_fields', explanation: 'pipeline mapped no ECS fields' };
    }
    return {
      score: score.parsedLines / score.totalLines,
      label: status,
      explanation: `${score.parsedLines}/${score.totalLines} lines parsed without errors`,
    };
  }),
];
