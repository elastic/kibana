/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import { ModelFamily, ModelProvider } from '@kbn/inference-common';
import type { EvaluationCompleteEvent, RanExperiment } from '../types';
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
      runId: 'run-123',
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
      run_id: 'run-123',
      experiment_id: 'exp-1',
      suite_id: 'suite-a',
      task_model: taskModel,
      evaluator_model: evaluatorModel,
      run_metadata: {
        total_repetitions: 2,
        git_branch: 'main',
        git_commit_sha: 'abc123',
      },
      environment: {
        hostname: 'host-a',
      },
      ci: {
        buildkite: {
          build_id: 'build-1',
          job_id: 'job-1',
        },
      },
    });
    expect(requests[0].scores).toHaveLength(1);
  });

  it('builds one request per experiment', () => {
    const experiments: RanExperiment[] = [
      {
        id: 'exp-1',
        datasetId: 'dataset-1',
        datasetName: 'Dataset 1',
        runs: {
          'run-1': createEvent().taskRun,
        },
        evaluationRuns: [createEvent().evaluationRun],
      },
      {
        id: 'exp-2',
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
      runId: 'run-456',
      taskModel,
      evaluatorModel,
      repetitions: 1,
      hostName: 'host-b',
      gitMetadata: { branch: null, commitSha: null },
      source: { kind: 'experiments', experiments },
    });

    expect(requests).toHaveLength(2);
    expect(requests.map((request) => request.experiment_id).sort()).toEqual(['exp-1', 'exp-2']);
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
      runId: 'run-789',
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
      runId: 'run-000',
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
    expect(log.warning).toHaveBeenCalledWith(
      'Skipped 2 score(s) for run "run-000" due to missing model id'
    );
  });
});
