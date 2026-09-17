/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { EvaluationResult } from '@kbn/evals';
import { pythonRound } from './python';

export const ratingSchema = z.object({ score: z.number().int().min(1).max(5), reason: z.string() });
export const ratingResponseSchema = z.object({
  score: z.number().optional(),
  reason: z.string().optional(),
});

/** Converts the Python judge's clamped 1–5 rating to its score and explanation. */
export const gradeRating = (response: z.infer<typeof ratingResponseSchema>): EvaluationResult => {
  const rating = Math.max(1, Math.min(5, Math.trunc(response.score ?? 1)));
  return {
    score: pythonRound((rating - 1) / 4),
    explanation: `rating=${rating}/5 — ${response.reason ?? ''}`,
  };
};
