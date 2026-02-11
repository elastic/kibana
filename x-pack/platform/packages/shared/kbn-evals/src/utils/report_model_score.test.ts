/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapToEvaluationScoreDocuments } from './report_model_score';
import type { RanExperiment } from '../types';
import { ModelProvider, ModelFamily } from '@kbn/inference-common';

describe('mapToEvaluationScoreDocuments', () => {
  const taskModel = {
    id: 'gpt-4',
    family: ModelFamily.GPT,
    provider: ModelProvider.OpenAI,
  };

  const evaluatorModel = {
    id: 'claude-3',
    family: ModelFamily.Claude,
    provider: ModelProvider.Anthropic,
  };

  it('builds documents with dataset name from runs', async () => {
    const experiments = [
      {
        id: 'exp-1',
        datasetId: 'dataset-1',
        datasetName: 'Dataset 1',
        runs: {
          'run-1': {
            exampleIndex: 0,
            repetition: 0,
            input: { question: 'one' },
            expected: undefined,
            metadata: undefined,
            output: undefined,
          },
        },
        evaluationRuns: [
          {
            name: 'Correctness',
            experimentRunId: 'run-1',
            result: { score: 0.5 },
          },
        ],
      },
    ] as RanExperiment[];

    const docs = await mapToEvaluationScoreDocuments({
      experiments,
      taskModel,
      evaluatorModel,
      runId: 'run-123',
      totalRepetitions: 1,
    });

    expect(docs[0].example.dataset.name).toBe('Dataset 1');
    expect(docs[0].example.id).toBe('0');
  });

  it('uses experiment run id to resolve example id when available', async () => {
    const experiments = [
      {
        id: 'exp-1',
        datasetId: 'dataset-1',
        datasetName: 'Dataset 1',
        runs: {
          'run-1': {
            exampleIndex: 0,
            repetition: 0,
            input: { question: 'two' },
            expected: undefined,
            metadata: undefined,
            output: undefined,
            traceId: 'trace-1',
          },
        },
        evaluationRuns: [
          {
            name: 'Correctness',
            experimentRunId: 'run-1',
            result: { score: 0.9 },
            exampleId: 'example-2',
          },
        ],
      },
    ] as RanExperiment[];

    const docs = await mapToEvaluationScoreDocuments({
      experiments,
      taskModel,
      evaluatorModel,
      runId: 'run-123',
      totalRepetitions: 1,
    });

    expect(docs[0].example.id).toBe('example-2');
    expect(docs[0].task.trace_id).toBe('trace-1');
  });
});
