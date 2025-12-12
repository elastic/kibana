/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example } from '@arizeai/phoenix-client/dist/esm/types/datasets';
import type { TaskOutput } from '@arizeai/phoenix-client/dist/esm/types/experiments';
import type { Evaluator } from '../types';

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

  return evaluators.filter((evaluator) => evaluatorsFromEnv.includes(evaluator.name));
}
