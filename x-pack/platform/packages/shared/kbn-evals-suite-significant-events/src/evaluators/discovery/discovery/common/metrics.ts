/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Harmonic mean of precision and recall. */
export function f1(precision: number, recall: number): number {
  return precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
}

/**
 * Set-based precision, recall, and F1 over two ID arrays.
 * Deduplicates both sides before scoring so duplicate IDs do not inflate or deflate results.
 * Returns score=1 when expectedIds is empty (vacuously correct).
 */
export function setPrf(
  actualIds: string[],
  expectedIds: string[]
): { score: number; precision: number; recall: number } {
  if (expectedIds.length === 0) return { score: 1, precision: 1, recall: 1 };
  const actualSet = new Set(actualIds);
  const expectedSet = new Set(expectedIds);
  const tp = [...expectedSet].filter((id) => actualSet.has(id)).length;
  const precision = actualSet.size === 0 ? 0 : tp / actualSet.size;
  const recall = tp / expectedSet.size;
  return { score: f1(precision, recall), precision, recall };
}

/**
 * Extract rule UUIDs from a signal array.
 * Handles both a top-level `rule_uuid` field and `metadata.rule_uuid` so callers
 * do not need to normalise the signal shape before extracting identities.
 */
export function extractRuleUuids(
  signals: Array<{ rule_uuid?: string; metadata?: { rule_uuid?: string } }> | undefined
): Set<string> {
  return new Set(
    (signals ?? [])
      .map((s) => s.rule_uuid ?? s.metadata?.rule_uuid)
      .filter((id): id is string => Boolean(id))
  );
}
