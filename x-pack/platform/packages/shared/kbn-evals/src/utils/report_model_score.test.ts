/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  mapToEvaluationScoreDocuments,
  collectTraceLinkInfo,
  generateTraceUrl,
} from './report_model_score';
import type { RanExperiment, TraceLinkInfo } from '../types';
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

describe('collectTraceLinkInfo', () => {
  const createMockExperiment = (
    datasetName: string,
    runs: Record<string, { evalThreadId?: string }>
  ): RanExperiment => ({
    id: 'exp-1',
    datasetId: 'dataset-1',
    datasetName,
    runs: Object.fromEntries(
      Object.entries(runs).map(([key, run]) => [
        key,
        {
          exampleIndex: 0,
          repetition: 0,
          input: {},
          expected: {},
          metadata: null,
          output: {},
          evalThreadId: run.evalThreadId,
        },
      ])
    ),
    evaluationRuns: [],
  });

  it('should collect trace IDs from experiments with valid evalThreadIds', () => {
    const experiments = [
      createMockExperiment('Dataset A', {
        'run-0': { evalThreadId: '0af7651916cd43dd8448eb211c80319c' },
        'run-1': { evalThreadId: '1bf7651916cd43dd8448eb211c80319d' },
      }),
    ];

    const result = collectTraceLinkInfo(experiments);

    expect(result.totalTraceCount).toBe(2);
    expect(result.traceIdsByDataset.get('Dataset A')).toEqual([
      '0af7651916cd43dd8448eb211c80319c',
      '1bf7651916cd43dd8448eb211c80319d',
    ]);
  });

  it('should filter out invalid trace IDs', () => {
    const experiments = [
      createMockExperiment('Dataset A', {
        'run-0': { evalThreadId: '0af7651916cd43dd8448eb211c80319c' },
        'run-1': { evalThreadId: 'invalid-trace-id' },
        'run-2': { evalThreadId: undefined },
      }),
    ];

    const result = collectTraceLinkInfo(experiments);

    expect(result.totalTraceCount).toBe(1);
    expect(result.traceIdsByDataset.get('Dataset A')).toEqual(['0af7651916cd43dd8448eb211c80319c']);
  });

  it('should group trace IDs by dataset name', () => {
    const experiments = [
      createMockExperiment('Dataset A', {
        'run-0': { evalThreadId: '0af7651916cd43dd8448eb211c80319c' },
      }),
      createMockExperiment('Dataset B', {
        'run-0': { evalThreadId: '1bf7651916cd43dd8448eb211c80319d' },
        'run-1': { evalThreadId: '2cf7651916cd43dd8448eb211c80319e' },
      }),
    ];

    const result = collectTraceLinkInfo(experiments);

    expect(result.totalTraceCount).toBe(3);
    expect(result.traceIdsByDataset.get('Dataset A')?.length).toBe(1);
    expect(result.traceIdsByDataset.get('Dataset B')?.length).toBe(2);
  });

  it('should include traceBaseUrl and projectId when provided', () => {
    const experiments = [
      createMockExperiment('Dataset A', {
        'run-0': { evalThreadId: '0af7651916cd43dd8448eb211c80319c' },
      }),
    ];

    const result = collectTraceLinkInfo(experiments, 'http://localhost:6006', 'project-123');

    expect(result.traceBaseUrl).toBe('http://localhost:6006');
    expect(result.projectId).toBe('project-123');
  });

  it('should return empty map when no valid trace IDs exist', () => {
    const experiments = [
      createMockExperiment('Dataset A', {
        'run-0': { evalThreadId: undefined },
        'run-1': { evalThreadId: 'invalid' },
      }),
    ];

    const result = collectTraceLinkInfo(experiments);

    expect(result.totalTraceCount).toBe(0);
    expect(result.traceIdsByDataset.size).toBe(0);
  });
});

describe('generateTraceUrl', () => {
  const traceId = '0af7651916cd43dd8448eb211c80319c';

  it('should return undefined when traceBaseUrl is not set', () => {
    const traceLinkInfo: TraceLinkInfo = {
      traceIdsByDataset: new Map(),
      totalTraceCount: 0,
    };

    expect(generateTraceUrl(traceId, traceLinkInfo)).toBeUndefined();
  });

  it('should generate Phoenix-style URL when projectId is provided', () => {
    const traceLinkInfo: TraceLinkInfo = {
      traceIdsByDataset: new Map(),
      totalTraceCount: 0,
      traceBaseUrl: 'http://localhost:6006',
      projectId: 'project-123',
    };

    const url = generateTraceUrl(traceId, traceLinkInfo);

    expect(url).toBe(`http://localhost:6006/projects/project-123/traces/${traceId}?selected`);
  });

  it('should generate generic trace URL when projectId is not provided', () => {
    const traceLinkInfo: TraceLinkInfo = {
      traceIdsByDataset: new Map(),
      totalTraceCount: 0,
      traceBaseUrl: 'http://localhost:5601/app/apm',
    };

    const url = generateTraceUrl(traceId, traceLinkInfo);

    expect(url).toBe(`http://localhost:5601/app/apm/traces/${traceId}`);
  });

  it('should handle trailing slashes in base URL', () => {
    const traceLinkInfo: TraceLinkInfo = {
      traceIdsByDataset: new Map(),
      totalTraceCount: 0,
      traceBaseUrl: 'http://localhost:6006/',
      projectId: 'project-123',
    };

    const url = generateTraceUrl(traceId, traceLinkInfo);

    expect(url).toBe(`http://localhost:6006/projects/project-123/traces/${traceId}?selected`);
  });
});
