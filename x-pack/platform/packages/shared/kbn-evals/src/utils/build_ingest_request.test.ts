/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import { ModelFamily, ModelProvider } from '@kbn/inference-common';
import type { EvaluationCompleteEvent, DatasetRunResult } from '../types';
import { buildIngestRequest } from './build_ingest_request';

const createLog = (): jest.Mocked<Pick<SomeDevLog, 'warning'>> => ({
  warning: jest.fn(),
});

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

const createEvent = (
  overrides: Partial<EvaluationCompleteEvent> = {}
): EvaluationCompleteEvent => ({
  experimentId: 'exp-1',
  experimentName: 'test-experiment',
  datasetId: 'dataset-1',
  datasetName: 'Dataset 1',
  taskRun: {
    exampleIndex: 0,
    repetition: 0,
    input: { question: 'What is this?' },
    expected: null,
    metadata: null,
    output: { answer: 'A test' },
    traceId: 'trace-task-1',
  },
  evaluationRun: {
    name: 'Correctness',
    result: {
      score: 0.9,
      label: 'pass',
      explanation: 'Looks good',
      metadata: { model: 'judge' },
    },
    experimentRunId: 'run-1',
    traceId: 'trace-eval-1',
    exampleId: 'example-1',
  },
  exampleId: 'example-1',
  ...overrides,
});

describe('buildIngestRequest', () => {
  it('builds a single request for a single event source', () => {
    const requests = buildIngestRequest({
      taskModel,
      evaluatorModel,
      repetitions: 2,
      hostName: 'host-a',
      gitMetadata: { branch: 'main', commitSha: 'abc123' },
      suiteId: 'suite-a',
      buildkiteMetadata: { build_id: 'build-1', job_id: 'job-1' },
      source: { kind: 'event', event: createEvent() },
    });

    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      experiment_id: 'exp-1',
      experiment_name: 'test-experiment',
      task_model: taskModel,
      evaluator_model: evaluatorModel,
      metadata: {
        execution_id: 'exp-1',
        suite_id: 'suite-a',
        total_repetitions: 2,
        hostname: 'host-a',
        git: {
          branch: 'main',
          commit_sha: 'abc123',
        },
        ci: {
          build_id: 'build-1',
          job_id: 'job-1',
        },
      },
    });
    expect(requests[0].scores).toHaveLength(1);
  });

  it('uses explicit executionId for metadata.execution_id when provided', () => {
    const requests = buildIngestRequest({
      taskModel,
      evaluatorModel,
      repetitions: 1,
      hostName: 'host-a',
      gitMetadata: { branch: 'main', commitSha: 'abc123' },
      executionId: 'suite-run-42',
      source: { kind: 'event', event: createEvent() },
    });

    expect(requests).toHaveLength(1);
    expect(requests[0].experiment_id).toBe('exp-1');
    expect(requests[0].metadata.execution_id).toBe('suite-run-42');
  });

  it('falls back metadata.execution_id to experiment_id when executionId is omitted', () => {
    const requests = buildIngestRequest({
      taskModel,
      evaluatorModel,
      repetitions: 1,
      hostName: 'host-a',
      gitMetadata: { branch: null, commitSha: null },
      source: { kind: 'event', event: createEvent({ experimentId: 'standalone-exp' }) },
    });

    expect(requests).toHaveLength(1);
    expect(requests[0].experiment_id).toBe('standalone-exp');
    expect(requests[0].metadata.execution_id).toBe('standalone-exp');
  });

  it('builds one request per experiment', () => {
    const experiments: DatasetRunResult[] = [
      {
        id: 'exp-1',
        experimentName: 'experiment-a',
        datasetId: 'dataset-1',
        datasetName: 'Dataset 1',
        runs: {
          'run-1': createEvent().taskRun,
        },
        evaluationRuns: [createEvent().evaluationRun],
      },
      {
        id: 'exp-2',
        experimentName: 'experiment-b',
        datasetId: 'dataset-2',
        datasetName: 'Dataset 2',
        runs: {
          'run-b': {
            ...createEvent().taskRun,
            exampleIndex: 1,
          },
        },
        evaluationRuns: [
          {
            ...createEvent().evaluationRun,
            experimentRunId: 'run-b',
            exampleId: 'example-2',
          },
        ],
      },
    ];

    const requests = buildIngestRequest({
      taskModel,
      evaluatorModel,
      repetitions: 1,
      hostName: 'host-b',
      gitMetadata: { branch: null, commitSha: null },
      source: { kind: 'experiments', experiments },
    });

    expect(requests).toHaveLength(2);
    expect(requests[0].experiment_id).toBe('exp-1');
    expect(requests[1].experiment_id).toBe('exp-2');
  });

  it('chunks scores into requests of at most 1000 items', () => {
    const evaluationRuns = Array.from({ length: 1001 }, (_, index) => ({
      ...createEvent().evaluationRun,
      experimentRunId: `run-${index}`,
      exampleId: `example-${index}`,
    }));

    const runs = Object.fromEntries(
      Array.from({ length: 1001 }, (_, index) => [
        `run-${index}`,
        {
          ...createEvent().taskRun,
          exampleIndex: index,
        },
      ])
    );

    const requests = buildIngestRequest({
      taskModel,
      evaluatorModel,
      repetitions: 3,
      hostName: 'host-c',
      gitMetadata: { branch: 'main', commitSha: 'sha' },
      source: {
        kind: 'experiments',
        experiments: [
          {
            id: 'exp-chunk',
            experimentName: 'chunk-experiment',
            datasetId: 'dataset-chunk',
            datasetName: 'Dataset Chunk',
            runs,
            evaluationRuns,
          },
        ],
      },
    });

    expect(requests).toHaveLength(2);
    expect(requests[0].scores).toHaveLength(1000);
    expect(requests[1].scores).toHaveLength(1);
  });

  it('skips scores and logs warning when model id is missing', () => {
    const log = createLog();
    const requests = buildIngestRequest({
      taskModel: { ...taskModel, id: '' },
      evaluatorModel,
      repetitions: 1,
      hostName: 'host-d',
      gitMetadata: { branch: 'main', commitSha: 'sha' },
      log,
      source: {
        kind: 'experiments',
        experiments: [
          {
            id: 'exp-skip',
            experimentName: 'skip-experiment',
            datasetId: 'dataset-skip',
            datasetName: 'Dataset Skip',
            runs: {
              'run-1': createEvent().taskRun,
              'run-2': {
                ...createEvent().taskRun,
                exampleIndex: 1,
              },
            },
            evaluationRuns: [
              createEvent().evaluationRun,
              {
                ...createEvent().evaluationRun,
                experimentRunId: 'run-2',
                exampleId: 'example-2',
              },
            ],
          },
        ],
      },
    });

    expect(requests).toEqual([]);
    expect(log.warning).toHaveBeenCalledWith('Skipped 2 score(s) due to missing model id');
  });
});
