/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KIQueryGenerationEvaluator } from '../types';
import { getQueriesFromOutput } from '../types';

/**
 * Validates that every generated query has a severity_score within [0, 100].
 */
export const severityComplianceEvaluator: KIQueryGenerationEvaluator = {
  name: 'severity_compliance',
  kind: 'CODE' as const,
  evaluate: async ({ output }) => {
    const queries = getQueriesFromOutput(output);
    if (queries.length === 0) {
      return { score: null, explanation: 'No queries to check — no queries generated' };
    }

    const invalidQueries = queries.filter((q) => q.severity_score < 0 || q.severity_score > 100);
    const score = (queries.length - invalidQueries.length) / queries.length;

    return {
      score,
      explanation:
        invalidQueries.length > 0
          ? `${invalidQueries.length} queries have severity outside [0, 100]: ${invalidQueries
              .map((q) => `"${q.title}" has severity ${q.severity_score}`)
              .join('; ')}`
          : `All ${queries.length} queries have valid severity scores`,
      details: {
        total: queries.length,
        invalidQueries: invalidQueries.map((q) => ({
          title: q.title,
          severity_score: q.severity_score,
        })),
      },
    };
  },
};
