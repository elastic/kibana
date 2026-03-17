/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface KIDuplicationEvaluationDataset {
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

export const KI_DUPLICATION_DATASETS: KIDuplicationEvaluationDataset[] = [
  {
    name: 'KI duplication (synthtrace sample_logs)',
    description:
      'Indexes one synthtrace LogHub system into a dedicated stream, then runs KI identification multiple times to measure duplicated KIs across runs.',
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
