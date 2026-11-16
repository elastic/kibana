/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationScoreDocument } from './schemas/common_attributes.gen';

/**
 * The distinct judge models an execution's LLM evaluators scored with, most frequent
 * first. Pinned-baseline comparisons are only valid when both sides were scored by one
 * and the same judge, so callers reject executions that return more than one id.
 */
export const resolveJudgeModelIds = (scores: EvaluationScoreDocument[]): string[] => {
  const counts = new Map<string, number>();
  for (const score of scores) {
    const modelId = score.evaluator.kind === 'llm' ? score.evaluator.model?.id : undefined;
    if (modelId) {
      counts.set(modelId, (counts.get(modelId) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort(([, a], [, b]) => b - a).map(([modelId]) => modelId);
};
