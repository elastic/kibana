/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface FeaturesDuplicationEvaluationDataset {
  name: string;
  description: string;
  input: {
    scenario: string;
    stream_name: string;
    sample_document_count: number;
    runs: number;
    scenarioOpts?: Record<string, string | number | boolean>;
  };
}

export const FEATURES_DUPLICATION_DATASETS: FeaturesDuplicationEvaluationDataset[] = [
  {
    name: 'Features duplication (synthtrace sample_logs)',
    description:
      'Indexes one synthtrace LogHub system into a dedicated stream, then runs features identification multiple times to measure duplicated features across runs.',
    input: {
      scenario: 'sample_logs',
      stream_name: 'logs.otel',
      sample_document_count: 20,
      runs: 5,
      scenarioOpts: {
        skipFork: true,
      },
    },
  },
];
