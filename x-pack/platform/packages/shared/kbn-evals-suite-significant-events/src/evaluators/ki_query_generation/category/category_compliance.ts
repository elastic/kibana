/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KIQueryGenerationEvaluator } from '../types';
import { ALLOWED_CATEGORIES, getQueriesFromOutput } from '../types';

/**
 * Validates that every generated query uses one of the allowed significant
 * event categories (operational, configuration, resource_health, error, security).
 */
export const categoryComplianceEvaluator: KIQueryGenerationEvaluator = {
  name: 'category_compliance',
  kind: 'CODE' as const,
  evaluate: async ({ output }) => {
    const queries = getQueriesFromOutput(output);
    if (queries.length === 0) {
      return { score: null, explanation: 'No queries to check as no queries were generated' };
    }

    const invalidQueries = queries.filter((query) => !ALLOWED_CATEGORIES.includes(query.category));
    const score = (queries.length - invalidQueries.length) / queries.length;

    return {
      score,
      explanation:
        invalidQueries.length > 0
          ? `${invalidQueries.length} queries use unsupported categories: ${invalidQueries
              .map((q) => `"${q.title}" has category "${q.category}"`)
              .join('; ')}`
          : `All ${queries.length} queries use valid categories`,
      details: {
        total: queries.length,
        invalidQueries: invalidQueries.map((q) => ({
          title: q.title,
          category: q.category,
        })),
      },
    };
  },
};
