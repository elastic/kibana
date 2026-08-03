/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExcludeExperimentOutput } from './evaluators';

/**
 * Scores how many features the *initial* identification returned, before any
 * exclusion is in play. `llm_exclude_compliance` only scores whether excluded
 * features came back, so an arm that quietly extracts far less still scores 1.
 *
 * This deliberately does not score the follow-up runs. Volume returned under
 * exclusion instructions, and volume retained after filtering, are separate
 * questions that need their own scores to be comparable across arms; they are
 * reported here as metadata only.
 *
 * @see https://github.com/elastic/kibana/issues/282022
 */
export const initialFeatureCountEvaluator = {
  name: 'initial_feature_count',
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
    const rawCounts = followUpRuns.map((run) => run.rawFeatures.length);
    const retainedCounts = followUpRuns.map((run) => run.features.length);

    return {
      score: initialFeatures.length,
      explanation:
        `Initial identification returned ${initialFeatures.length} feature(s). ` +
        `Follow-up runs are not scored here: raw [${rawCounts.join(', ')}], ` +
        `retained [${retainedCounts.join(', ')}]`,
      metadata: {
        initial_features_count: initialFeatures.length,
        excluded_count: excludedFeatures.length,
        follow_up_raw_counts: rawCounts,
        follow_up_retained_counts: retainedCounts,
      },
    };
  },
};
