/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface SetMetrics {
  precision: number;
  recall: number;
  f1: number;
}

/**
 * Precision = correct predictions / total predicted
 * Recall    = correct predictions / total expected
 * F1        = 2 * precision * recall / (precision + recall)
 *
 * Computes set-based Precision, Recall, and F1 for an unordered predicted set
 * against an expected set.
 *
 * Empty-set behavior {precision, recall, f1}:
 *   - both sets empty                        -> {1, 1, 1}
 *   - predicted empty, expected non-empty    -> {0, 0, 0}
 *   - expected empty, predicted non-empty    -> {0, 0, 0}
 *
 * Note: T must be a primitive type (string | number). Object values are compared
 * by reference identity, which will silently produce 0 even for structurally equal
 * objects. Pass a string key (e.g. entity ID) rather than the entity itself.
 */
export const calculateSetMetrics = <T extends string | number>(
  predicted: Set<T>,
  expected: Set<T>
): SetMetrics => {
  if (predicted.size === 0 && expected.size === 0) return { precision: 1, recall: 1, f1: 1 };
  if (predicted.size === 0 || expected.size === 0) return { precision: 0, recall: 0, f1: 0 };

  const truePositives = [...predicted].filter((item) => expected.has(item)).length;
  const precision = truePositives / predicted.size;
  const recall = truePositives / expected.size;
  const f1 = precision + recall <= 0 ? 0 : (2 * precision * recall) / (precision + recall);

  return { precision, recall, f1 };
};
