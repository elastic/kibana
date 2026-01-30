/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Patterns like "Precision@K" that match any K-specific evaluator (e.g., "Precision@10") */
export const RAG_METRIC_PATTERNS = ['Precision@K', 'Recall@K', 'F1@K'];

/** Prefixes used by RAG metric evaluators */
export const RAG_METRIC_PREFIXES = ['Precision@', 'Recall@', 'F1@'];

/**
 * Returns true if pattern is a K-specific name like "Precision@10" (not allowed in SELECTED_EVALUATORS).
 * Use this to validate that users don't specify K-specific names directly.
 */
export function isKSpecificRagEvaluator(name: string): boolean {
  for (const prefix of RAG_METRIC_PREFIXES) {
    if (name.startsWith(prefix)) {
      const suffix = name.slice(prefix.length);
      return /^\d+$/.test(suffix);
    }
  }
  return false;
}

/**
 * Returns true if the given name is a RAG pattern (e.g., "Precision@K").
 */
export function isRagMetricPattern(name: string): boolean {
  return RAG_METRIC_PATTERNS.includes(name);
}

/**
 * Matches an evaluator name against a pattern.
 * Supports exact match and @K patterns (e.g., "Precision@K" matches "Precision@5", "Precision@10", etc.).
 *
 * @param evaluatorName - The actual evaluator name (e.g., "Precision@10")
 * @param pattern - The pattern to match against (e.g., "Precision@K" or exact name)
 * @returns true if the evaluator name matches the pattern
 */
export function matchesEvaluatorPattern(evaluatorName: string, pattern: string): boolean {
  if (isRagMetricPattern(pattern)) {
    const metricPrefix = pattern.replace('@K', '@');
    if (evaluatorName.startsWith(metricPrefix)) {
      const suffix = evaluatorName.slice(metricPrefix.length);
      return /^\d+$/.test(suffix);
    }
    return false;
  }

  return evaluatorName === pattern;
}

/**
 * Finds all evaluator names that match a given pattern.
 *
 * @param evaluatorNames - List of actual evaluator names
 * @param pattern - The pattern to match (e.g., "Precision@K" or exact name)
 * @returns Array of evaluator names that match the pattern
 */
export function findMatchingEvaluators(evaluatorNames: string[], pattern: string): string[] {
  return evaluatorNames.filter((name) => matchesEvaluatorPattern(name, pattern));
}

/**
 * Expands a list of patterns to actual evaluator names.
 * Patterns like "Precision@K" are expanded to all matching evaluators (e.g., "Precision@5", "Precision@10").
 * Exact names are kept as-is if they exist in the evaluator list.
 *
 * @param patterns - List of patterns or exact names
 * @param evaluatorNames - List of actual evaluator names to match against
 * @returns Array of actual evaluator names that match any of the patterns
 */
export function expandPatternsToEvaluators(patterns: string[], evaluatorNames: string[]): string[] {
  const matched = new Set<string>();

  for (const pattern of patterns) {
    const matches = findMatchingEvaluators(evaluatorNames, pattern);
    matches.forEach((name) => matched.add(name));
  }

  return Array.from(matched);
}
