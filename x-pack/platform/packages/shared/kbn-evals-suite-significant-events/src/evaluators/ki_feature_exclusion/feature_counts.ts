/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExcludeExperimentOutput } from './evaluators';

type ExcludeOutput = (ExcludeExperimentOutput & { traceId: string | null }) | null;

/**
 * Median tolerates a single anomalous follow-up run better than the mean: at
 * three runs it is neither dragged by an outlier (mean) nor defined by it (min).
 * For even-length inputs it averages the two central values.
 */
const median = (nums: number[]): number => {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

/**
 * Scores how many features the initial identification returned, before any
 * exclusion. `llm_exclude_compliance` only scores whether excluded features
 * came back, so an arm that quietly extracts far less still scores 1.
 */
export const initialFeatureCountEvaluator = {
  name: 'initial_feature_count',
  kind: 'CODE' as const,
  evaluate: async ({ output }: { output: ExcludeOutput }) => {
    if (!output) {
      return { score: null, explanation: 'Experiment produced no output' };
    }

    const { initialFeatures, excludedFeatures } = output;

    return {
      score: initialFeatures.length,
      explanation: `Initial identification returned ${initialFeatures.length} feature(s), before any exclusion`,
      metadata: {
        initial_features_count: initialFeatures.length,
        excluded_count: excludedFeatures.length,
      },
    };
  },
};

/**
 * Scores the raw feature count the model returned on follow-up runs after being
 * told to skip the excluded set, before any code-side filtering. A prompt that
 * turns timid once it sees an exclusion list shows up here as a low count.
 */
export const followUpReturnedCountEvaluator = {
  name: 'follow_up_returned_count',
  kind: 'CODE' as const,
  evaluate: async ({ output }: { output: ExcludeOutput }) => {
    if (!output) {
      return { score: null, explanation: 'Experiment produced no output' };
    }

    const { followUpRuns } = output;

    if (followUpRuns.length === 0) {
      return { score: null, explanation: 'Inconclusive: no follow-up runs to evaluate' };
    }

    const rawCounts = followUpRuns.map((run) => run.rawFeatures.length);
    const score = median(rawCounts);

    return {
      score,
      explanation: `Follow-up runs returned raw [${rawCounts.join(
        ', '
      )}] feature(s) under exclusion; median ${score}`,
      metadata: {
        follow_up_raw_counts: rawCounts,
        follow_up_runs: followUpRuns.length,
      },
    };
  },
};

/**
 * Scores how many features survive after the code strips those that slipped
 * through the exclusion instruction: the closest number to user-visible value.
 */
export const followUpRetainedCountEvaluator = {
  name: 'follow_up_retained_count',
  kind: 'CODE' as const,
  evaluate: async ({ output }: { output: ExcludeOutput }) => {
    if (!output) {
      return { score: null, explanation: 'Experiment produced no output' };
    }

    const { followUpRuns } = output;

    if (followUpRuns.length === 0) {
      return { score: null, explanation: 'Inconclusive: no follow-up runs to evaluate' };
    }

    const retainedCounts = followUpRuns.map((run) => run.features.length);
    const score = median(retainedCounts);

    return {
      score,
      explanation: `Follow-up runs retained [${retainedCounts.join(
        ', '
      )}] feature(s) after filtering; median ${score}`,
      metadata: {
        follow_up_retained_counts: retainedCounts,
        follow_up_runs: followUpRuns.length,
      },
    };
  },
};
