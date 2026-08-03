/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KIFeatureExtractionEvaluator } from '../types';
import { getFeaturesFromOutput } from '../types';

/**
 * Reports how many features the run actually returned, as a raw count rather
 * than a score. `ki_feature_count` only checks the count against the dataset's
 * min/max bounds, which are wide enough that large swings score 1, so it cannot
 * be used to compare extraction volume across arms.
 */
export const extractedFeatureCountEvaluator = {
  name: 'extracted_feature_count',
  kind: 'CODE' as const,
  evaluate: async ({ output }) => {
    const features = getFeaturesFromOutput(output);
    const evidenceCounts = features.map((feature) => feature.evidence?.length ?? 0);
    const totalEvidence = evidenceCounts.reduce((sum, count) => sum + count, 0);

    return {
      score: features.length,
      explanation: `Returned ${features.length} feature(s) with ${totalEvidence} evidence string(s)`,
      details: {
        featureCount: features.length,
        totalEvidence,
        maxEvidencePerFeature: evidenceCounts.length ? Math.max(...evidenceCounts) : 0,
        featuresWithoutEvidence: evidenceCounts.filter((count) => count === 0).length,
      },
    };
  },
} satisfies KIFeatureExtractionEvaluator;
