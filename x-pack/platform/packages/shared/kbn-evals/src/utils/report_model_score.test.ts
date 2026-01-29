/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildFlattenedScoreDocuments } from './report_model_score';
import type { RanExperiment } from '../types';

describe('buildFlattenedScoreDocuments', () => {
  const taskModel = {
    id: 'gpt-4',
    family: 'openai',
    provider: 'azure',
  };

  const evaluatorModel = {
    id: 'claude-3',
    family: 'claude',
    provider: 'anthropic',
  };

  it('builds documents with dataset name and input hash from runs', async () => {
    const experiments = [
      {
        id: 'exp-1',
        datasetId: 'dataset-1',
        datasetName: 'Dataset 1',
        runs: {
          'run-1': { exampleIndex: 0, repetition: 0, input: { question: 'one' } },
        },
        evaluationRuns: [
          {
            name: 'Correctness',
            result: { score: 0.5 },
            exampleIndex: 0,
            repetitionIndex: 0,
          },
        ],
      },
    ] as RanExperiment[];

    const docs = await buildFlattenedScoreDocuments({
      experiments,
      taskModel,
      evaluatorModel,
      runId: 'run-123',
      totalRepetitions: 1,
    });

    expect(docs[0].example.dataset.name).toBe('Dataset 1');
    expect(docs[0].example.id).toBe('0');
    expect(docs[0].example.input_hash).not.toBe('');
  });

  it('uses experiment run id to resolve example id when available', async () => {
    const experiments = [
      {
        id: 'exp-1',
        datasetId: 'dataset-1',
        datasetName: 'Dataset 1',
        runs: {
          'run-1': { datasetExampleId: 'example-2', traceId: 'trace-1', input: { question: 'two' } },
        },
        evaluationRuns: [
          {
            name: 'Correctness',
            experimentRunId: 'run-1',
            repetitionIndex: 0,
            result: { score: 0.9 },
          },
        ],
      },
    ] as RanExperiment[];

    const docs = await buildFlattenedScoreDocuments({
      experiments,
      taskModel,
      evaluatorModel,
      runId: 'run-123',
      totalRepetitions: 1,
    });

    expect(docs[0].example.id).toBe('example-2');
    expect(docs[0].example.input_hash).not.toBe('');
    expect(docs[0].task.trace_id).toBe('trace-1');
  });
});
