/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExcludeExperimentOutput } from './evaluators';

/**
 * Reports extraction volume for the exclusion flow. `llm_exclude_compliance`
 * only scores whether excluded features came back, so a run that quietly
 * returns far fewer features than another arm still scores 1.
 */
export const excludeFeatureCountEvaluator = {
  name: 'exclude_feature_count',
  kind: 'CODE' as const,
  evaluate: async ({
    output,
  }: {
    output: (ExcludeExperimentOutput & { traceId: string | null }) | null;
  }) => {
    if (!output) {
      return { score: null, explanation: 'Experiment produced no output' };
    }

    const { initialFeatures, excludedFeatures, followUpRuns } = output;
    const followUpCounts = followUpRuns.map((run) => run.rawFeatures.length);
    const meanFollowUp = followUpCounts.length
      ? followUpCounts.reduce((sum, count) => sum + count, 0) / followUpCounts.length
      : 0;

    return {
      score: initialFeatures.length,
      explanation:
        `Initial identification returned ${initialFeatures.length} feature(s); ` +
        `follow-up runs averaged ${meanFollowUp.toFixed(1)} raw feature(s)`,
      metadata: {
        initial_features_count: initialFeatures.length,
        excluded_count: excludedFeatures.length,
        follow_up_raw_counts: followUpCounts,
        mean_follow_up_raw_count: meanFollowUp,
      },
    };
  },
};
