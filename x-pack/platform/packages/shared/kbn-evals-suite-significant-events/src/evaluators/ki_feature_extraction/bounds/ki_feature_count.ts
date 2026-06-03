/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KIFeatureExtractionEvaluator } from '../types';
import { getFeaturesFromOutput } from '../types';

/**
 * If min_features or max_features is specified in expected output,
 * verifies the KI feature count falls within bounds with proportional penalties.
 */
export const kiFeatureCountEvaluator = {
  name: 'ki_feature_count',
  kind: 'CODE' as const,
  evaluate: async ({ output, expected }) => {
    const count = getFeaturesFromOutput(output).length;
    const { min_features = -Infinity, max_features = Infinity } = expected;

    const issues: string[] = [];
    let score = 1;

    if (count < min_features) {
      issues.push(`Expected at least ${min_features} KI feature(s), got ${count}`);
      score = min_features > 0 ? Math.max(0, count / min_features) : 0;
    }
    if (count > max_features) {
      issues.push(`Expected at most ${max_features} KI feature(s), got ${count}`);
      score = max_features > 0 ? Math.max(0, 1 - (count - max_features) / max_features) : 0;
    }

    return {
      score,
      explanation:
        issues.length > 0
          ? `${issues.join('; ')} (score=${score.toFixed(2)})`
          : `KI feature count ${count} is within bounds [${min_features}, ${max_features}]`,
      details: { count, min_features, max_features },
    };
  },
} satisfies KIFeatureExtractionEvaluator;
