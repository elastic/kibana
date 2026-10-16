/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The evaluator names listed more than once. A stored score is identified by its evaluator's
 * name, so a name that repeats resolves to the same document even when the two entries judge
 * with different models, and only the first score survives.
 */
export const findDuplicateEvaluatorNames = (evaluators: Array<{ name: string }>): string[] => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const { name } of evaluators) {
    if (seen.has(name)) {
      duplicates.add(name);
    }
    seen.add(name);
  }

  return [...duplicates];
};

export const getDuplicateEvaluatorNamesMessage = (duplicateNames: string[]): string =>
  `Evaluators must have distinct names, but these are listed more than once: ${duplicateNames.join(
    ', '
  )}. Scores are stored per evaluator name, so only one score per name would be kept.`;
