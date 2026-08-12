/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KIQueryGenerationEvaluator, QueryAttempt } from '../types';
import { getQueriesFromOutput } from '../types';

const getQueryAttempts = (output: unknown): QueryAttempt[] | undefined =>
  output &&
  typeof output === 'object' &&
  !Array.isArray(output) &&
  'query_attempts' in output &&
  Array.isArray((output as { query_attempts: unknown }).query_attempts)
    ? (output as { query_attempts: QueryAttempt[] }).query_attempts
    : undefined;

const getExistingQueries = (
  input: unknown
): Array<{ id: string; title: string; esql: string }> | undefined => {
  if (!input || typeof input !== 'object') {
    return undefined;
  }
  const existing = (input as { existing_queries?: unknown }).existing_queries;
  return Array.isArray(existing) && existing.length > 0
    ? (existing as Array<{ id: string; title: string; esql: string }>)
    : undefined;
};

// Counts rejected exact duplicates of seeded queries. Abstains without seeds or attempt diagnostics.
export const exactDuplicateAvoidanceEvaluator: KIQueryGenerationEvaluator = {
  name: 'exact_duplicate_avoidance',
  kind: 'CODE' as const,
  evaluate: async ({ input, output }) => {
    const existingQueries = getExistingQueries(input);
    if (!existingQueries) {
      return { score: null, explanation: 'No existing queries seeded' };
    }

    const attempts = getQueryAttempts(output);
    if (!attempts) {
      return {
        score: null,
        explanation: 'No query attempt diagnostics collected: task did not return query_attempts',
      };
    }

    const exactDuplicateAttemptCount = attempts.filter(
      (attempt) => attempt.status === 'Duplicate'
    ).length;
    const acceptedCount = attempts.filter((attempt) => attempt.status === 'Added').length;
    const failedCount = attempts.filter((attempt) => attempt.status === 'Failed to add').length;
    const attemptedQueryCount = attempts.length;

    const acceptedQueries = getQueriesFromOutput(output);

    const score = 1 - exactDuplicateAttemptCount / Math.max(1, attemptedQueryCount);

    return {
      score,
      explanation: `${exactDuplicateAttemptCount}/${attemptedQueryCount} attempted queries were exact duplicates of seeded queries`,
      metadata: {
        attemptedQueryCount,
        exactDuplicateAttemptCount,
        acceptedCount,
        failedCount,
        acceptedQueryCountInOutput: acceptedQueries.length,
      },
    };
  },
};
