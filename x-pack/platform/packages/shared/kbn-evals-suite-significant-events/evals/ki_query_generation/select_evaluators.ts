/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseSelectedEvaluators } from '@kbn/evals';

/**
 * Applies `SELECTED_EVALUATORS` to the complete evaluator list after it is
 * assembled, failing fast on unknown or empty selections instead of silently
 * running nothing. This suite uses exact evaluator names only; @K metric
 * patterns are not supported.
 */
export const selectQueryGenerationEvaluators = <TEvaluator extends { name: string }>(
  evaluators: TEvaluator[]
): TEvaluator[] => {
  if (evaluators.length === 0) {
    throw new Error('Cannot select evaluators from an empty list');
  }

  const requested = parseSelectedEvaluators();
  if (requested.length === 0) {
    return evaluators;
  }

  const available = evaluators.map((evaluator) => evaluator.name);
  const unknown = requested.filter((name) => !available.includes(name));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown evaluator(s) requested via SELECTED_EVALUATORS: ${unknown.join(', ')}. ` +
        `Available: ${available.join(', ')}.`
    );
  }

  const selected = evaluators.filter((evaluator) => requested.includes(evaluator.name));
  if (selected.length === 0) {
    throw new Error(
      `SELECTED_EVALUATORS matched no evaluators. Available: ${available.join(', ')}.`
    );
  }
  return selected;
};
