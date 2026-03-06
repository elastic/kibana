/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface FeaturesSoftDeleteEvaluationDataset {
  name: string;
  description: string;
  input: {
    scenario: string;
    stream_name: string;
    sample_document_count: number;
    delete_count: number;
    follow_up_runs: number;
    scenarioOpts?: Record<string, string | number | boolean>;
  };
}

export const FEATURES_SOFT_DELETE_DATASETS: FeaturesSoftDeleteEvaluationDataset[] = [
  {
    name: 'Features soft delete - 4 deleted (synthtrace sample_logs)',
    description:
      'Indexes a synthtrace scenario, runs feature identification once, soft-deletes a subset of identified features, then runs identification again multiple times to verify deleted features are not re-identified.',
    input: {
      scenario: 'sample_logs',
      stream_name: 'logs.otel',
      sample_document_count: 20,
      delete_count: 4,
      follow_up_runs: 3,
      scenarioOpts: {
        skipFork: true,
      },
    },
  },
  {
    name: 'Features soft delete - 1 deleted (synthtrace sample_logs)',
    description:
      'Edge case: soft-deletes a single feature and verifies it is not re-identified across multiple follow-up runs.',
    input: {
      scenario: 'sample_logs',
      stream_name: 'logs.otel',
      sample_document_count: 20,
      delete_count: 1,
      follow_up_runs: 3,
      scenarioOpts: {
        skipFork: true,
      },
    },
  },
];
