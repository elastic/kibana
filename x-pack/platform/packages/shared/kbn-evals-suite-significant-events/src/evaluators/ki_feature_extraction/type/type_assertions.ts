/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KIFeatureExtractionEvaluator } from '../types';
import { getFeaturesFromOutput } from '../types';

/**
 * If required_types or forbidden_types is specified, checks KI types accordingly.
 */
export const typeAssertionsEvaluator = {
  name: 'type_assertions',
  kind: 'CODE' as const,
  evaluate: async ({ output, expected }) => {
    const { required_types, forbidden_types } = expected;

    if (!required_types?.length && !forbidden_types?.length) {
      return { score: null, explanation: 'No type assertions specified' };
    }

    const features = getFeaturesFromOutput(output);
    const presentTypes = new Set(features.map((feature) => feature.type));
    const issues: string[] = [];
    let totalAssertions = 0;
    let passedAssertions = 0;

    if (required_types?.length) {
      for (const requiredType of required_types) {
        totalAssertions++;
        if (presentTypes.has(requiredType)) {
          passedAssertions++;
        } else {
          issues.push(`Required type "${requiredType}" not found in output`);
        }
      }
    }

    if (forbidden_types?.length) {
      for (const forbiddenType of forbidden_types) {
        totalAssertions++;
        if (!presentTypes.has(forbiddenType)) {
          passedAssertions++;
        } else {
          const violating = features
            .filter((feature) => feature.type === forbiddenType)
            .map((feature) => feature.id);
          issues.push(
            `Forbidden type "${forbiddenType}" found in KI features: ${violating.join(', ')}`
          );
        }
      }
    }

    return {
      score: totalAssertions > 0 ? passedAssertions / totalAssertions : 1,
      explanation:
        issues.length > 0
          ? `Type assertion failures: ${issues.join('; ')}`
          : 'All type assertions passed',
      details: { presentTypes: [...presentTypes], required_types, forbidden_types, issues },
    };
  },
} satisfies KIFeatureExtractionEvaluator;
