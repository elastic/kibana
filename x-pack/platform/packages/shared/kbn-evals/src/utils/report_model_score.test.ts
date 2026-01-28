/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RanExperiment } from '@arizeai/phoenix-client/dist/esm/types/experiments';
import { buildFlattenedScoreDocuments } from './report_model_score';
import type { KibanaPhoenixClient } from '../kibana_phoenix_client/client';

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

  it('populates example.id and input_hash from dataset examples', async () => {
    const phoenixClient = {
      getDatasetExamples: jest.fn().mockResolvedValue([
        { id: 'example-1', input: { question: 'one' } },
      ]),
    } as unknown as KibanaPhoenixClient;

    const experiments = [
      {
        id: 'exp-1',
        datasetId: 'dataset-1',
        evaluationRuns: [
          {
            name: 'Correctness',
            result: { score: 0.5 },
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
      phoenixClient,
    });

    expect(docs[0].example.id).toBe('example-1');
    expect(docs[0].example.input_hash).not.toBe('');
  });

  it('uses run data input and example id when available', async () => {
    const phoenixClient = {
      getDatasetExamples: jest.fn().mockResolvedValue([]),
    } as unknown as KibanaPhoenixClient;

    const experiments = [
      {
        id: 'exp-1',
        datasetId: 'dataset-1',
        runs: {
          'example-2': { input: { question: 'two' } },
        },
        evaluationRuns: [
          {
            name: 'Correctness',
            exampleId: 'example-2',
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
      phoenixClient,
    });

    expect(docs[0].example.id).toBe('example-2');
    expect(docs[0].example.input_hash).not.toBe('');
  });
});
