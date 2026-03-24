/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Patterns like "Precision@K" that match any K-specific evaluator (e.g., "Precision@10") */
export const RAG_METRIC_PATTERNS = ['Precision@K', 'Recall@K', 'F1@K'];

const RAG_METRIC_PREFIXES = ['Precision@', 'Recall@', 'F1@'];

/** Returns true if name is K-specific like "Precision@10" (not allowed in SELECTED_EVALUATORS) */
export function isKSpecificRagEvaluator(name: string): boolean {
  for (const prefix of RAG_METRIC_PREFIXES) {
    if (name.startsWith(prefix)) {
      return /^\d+$/.test(name.slice(prefix.length));
    }
  }
  return false;
}

/** Matches evaluator name against pattern. Supports exact match and @K patterns. */
export function matchesEvaluatorPattern(evaluatorName: string, pattern: string): boolean {
  if (RAG_METRIC_PATTERNS.includes(pattern)) {
    const prefix = pattern.replace('@K', '@');
    return evaluatorName.startsWith(prefix) && /^\d+$/.test(evaluatorName.slice(prefix.length));
  }
  return evaluatorName === pattern;
}

/** Expands patterns to actual evaluator names (e.g., "Precision@K" -> ["Precision@5", "Precision@10"]) */
export function expandPatternsToEvaluators(patterns: string[], evaluatorNames: string[]): string[] {
  const matched = new Set<string>();
  for (const pattern of patterns) {
    for (const name of evaluatorNames) {
      if (matchesEvaluatorPattern(name, pattern)) {
        matched.add(name);
      }
    }
  }
  return Array.from(matched);
}
