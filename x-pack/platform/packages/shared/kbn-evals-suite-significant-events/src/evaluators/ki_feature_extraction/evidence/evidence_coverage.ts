/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KIFeatureExtractionEvaluator } from '../types';
import { getFeaturesFromOutput } from '../types';

/**
 * Measures the fraction of KI features that include at least one evidence string.
 * Features without evidence indicate the model failed to justify its output.
 */
export const evidenceCoverageEvaluator = {
  name: 'evidence_coverage',
  kind: 'CODE' as const,
  evaluate: async ({ output }) => {
    const features = getFeaturesFromOutput(output);
    if (features.length === 0) {
      return { score: null, explanation: 'No KI features to evaluate' };
    }

    const withEvidence = features.filter((f) => (f.evidence ?? []).length > 0);
    const withoutEvidence = features.filter((f) => (f.evidence ?? []).length === 0);
    const score = withEvidence.length / features.length;

    return {
      score,
      explanation:
        withoutEvidence.length > 0
          ? `${withoutEvidence.length}/${
              features.length
            } feature(s) lack evidence: ${withoutEvidence.map((f) => `"${f.id}"`).join(', ')}`
          : `All ${features.length} feature(s) include evidence`,
      details: {
        total: features.length,
        withEvidence: withEvidence.length,
        withoutEvidence: withoutEvidence.map((f) => f.id),
      },
    };
  },
} satisfies KIFeatureExtractionEvaluator;
