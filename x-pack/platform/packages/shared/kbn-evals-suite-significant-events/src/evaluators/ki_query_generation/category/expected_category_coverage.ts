/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KIQueryGenerationEvaluator } from '../types';
import { getQueriesFromOutput } from '../types';

/**
 * Measures the fraction of expected categories that appear in the generated
 * queries. Returns `null` when no expected categories are specified.
 */
export const expectedCategoryCoverageEvaluator: KIQueryGenerationEvaluator = {
  name: 'expected_category_coverage',
  kind: 'CODE' as const,
  evaluate: async ({ output, expected }) => {
    const expectedCategories = (expected.expected_categories ?? []).map((c) => c.toLowerCase());
    if (expectedCategories.length === 0) {
      return { score: null, explanation: 'No expected categories specified' };
    }

    const queries = getQueriesFromOutput(output);
    const observedCategories = new Set(queries.map((q) => q.category.toLowerCase()));
    const missing = expectedCategories.filter((c) => !observedCategories.has(c));
    const score = (expectedCategories.length - missing.length) / expectedCategories.length;

    return {
      score,
      explanation:
        missing.length > 0
          ? `Missing expected categories: ${missing.join(', ')}`
          : `All expected categories covered: ${expectedCategories.join(', ')}`,
      details: {
        expectedCategories,
        observedCategories: [...observedCategories],
        missing,
      },
    };
  },
};
