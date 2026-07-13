/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, Example, TaskOutput } from '../types';
import { isKSpecificRagEvaluator, matchesEvaluatorPattern } from './patterns';

function matchesSelectedEvaluator(evaluatorName: string, selectedPattern: string): boolean {
  if (isKSpecificRagEvaluator(selectedPattern)) {
    return false;
  }
  return matchesEvaluatorPattern(evaluatorName, selectedPattern);
}

export function parseSelectedEvaluators() {
  return (
    process.env.SELECTED_EVALUATORS?.split(',').map((selectedEvaluator) =>
      selectedEvaluator.trim()
    ) ?? []
  );
}

export function selectEvaluators<TExample extends Example, TTaskOutput extends TaskOutput>(
  evaluators: Evaluator<TExample, TTaskOutput>[]
) {
  const evaluatorsFromEnv = parseSelectedEvaluators();

  if (evaluatorsFromEnv.length === 0) {
    return evaluators;
  }

  return evaluators.filter((evaluator) =>
    evaluatorsFromEnv.some((selected) => matchesSelectedEvaluator(evaluator.name, selected))
  );
}

/**
 * Fast-iteration mode for suites that mix CODE (deterministic) and LLM-as-judge
 * evaluators: set `KBN_EVALS_CODE_ONLY=true` to skip every `kind: 'LLM'` evaluator
 * (and, where the suite wires it up, any upstream LLM-judge task work like a
 * correctness-analysis call) so a routing/wiring change can be iterated on locally
 * without judge-model cost or latency. Intended as a cheaper tier alongside
 * `SELECTED_EVALUATORS` — not a replacement for a full run before merging.
 */
export function isCodeOnlyMode(): boolean {
  return process.env.KBN_EVALS_CODE_ONLY === 'true';
}

/**
 * Drops `kind: 'LLM'` evaluators from the stack when {@link isCodeOnlyMode} is
 * active; returns the stack unchanged otherwise. Apply this to a suite's full
 * evaluator array (after `selectEvaluators`, if both are used) — it only looks at
 * `evaluator.kind`, so evaluators tagged `kind: 'CODE'` (including trace-based and
 * inline evaluators) always run.
 */
export function filterEvaluatorsByKind<TExample extends Example, TTaskOutput extends TaskOutput>(
  evaluators: Evaluator<TExample, TTaskOutput>[]
): Evaluator<TExample, TTaskOutput>[] {
  if (!isCodeOnlyMode()) {
    return evaluators;
  }
  return evaluators.filter((evaluator) => evaluator.kind !== 'LLM');
}
