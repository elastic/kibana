/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, Example, TaskOutput } from '../types';

/** Patterns like "Precision@K" that match any K-specific evaluator (e.g., "Precision@10") */
const RAG_METRIC_PATTERNS = ['Precision@K', 'Recall@K', 'F1@K'];

const RAG_METRIC_PREFIXES = ['Precision@', 'Recall@', 'F1@'];

/** Returns true if pattern is a K-specific name like "Precision@10" (not allowed in SELECTED_EVALUATORS) */
function isKSpecificRagEvaluator(selectedPattern: string): boolean {
  for (const prefix of RAG_METRIC_PREFIXES) {
    if (selectedPattern.startsWith(prefix)) {
      const suffix = selectedPattern.slice(prefix.length);
      return /^\d+$/.test(suffix);
    }
  }
  return false;
}

/** Matches evaluator name against selected pattern. Supports exact match and @K patterns. */
function matchesSelectedEvaluator(evaluatorName: string, selectedPattern: string): boolean {
  if (isKSpecificRagEvaluator(selectedPattern)) {
    return false;
  }

  if (RAG_METRIC_PATTERNS.includes(selectedPattern)) {
    const metricPrefix = selectedPattern.replace('@K', '@');
    if (evaluatorName.startsWith(metricPrefix)) {
      const suffix = evaluatorName.slice(metricPrefix.length);
      return /^\d+$/.test(suffix);
    }
    return false;
  }

  return evaluatorName === selectedPattern;
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
