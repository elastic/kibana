/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { SomeDevLog } from '@kbn/some-dev-log';
import {
  EVALS_RUN_SCORES_URL,
  EVALS_RUN_URL,
  EVALS_SCORES_URL,
  MAX_SCORES_PER_QUERY,
  type EvaluationScoreDocument,
  type IngestScoresRequestBodyInput,
} from '@kbn/evals-common';
import type { IngestScoresError } from './evals_client';
import { EvalsClient } from './evals_client';
import { checkEvaluationsPluginEnabled } from './evaluations_kbn_client';

jest.mock('./evaluations_kbn_client', () => ({
  checkEvaluationsPluginEnabled: jest.fn(),
}));

const createMockKbnClient = (): jest.Mocked<KbnClient> =>
  ({
    request: jest.fn(),
  } as unknown as jest.Mocked<KbnClient>);

const asKbnResponse = <T>(value: T, status?: number): Awaited<ReturnType<KbnClient['request']>> =>
  (status === undefined ? value : { data: value, status }) as unknown as Awaited<
    ReturnType<KbnClient['request']>
  >;

const createLog = (): jest.Mocked<SomeDevLog> =>
  ({
    debug: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    verbose: jest.fn(),
    trace: jest.fn(),
    success: jest.fn(),
    fatal: jest.fn(),
  } as unknown as jest.Mocked<SomeDevLog>);

const createIngestRequest = (): IngestScoresRequestBodyInput => ({
  run_id: 'run-123',
  experiment_id: 'experiment-1',
  suite_id: 'suite-a',
  task_model: { id: 'gpt-4', family: 'gpt', provider: 'openai' },
  evaluator_model: { id: 'gpt-4o-mini', family: 'gpt', provider: 'openai' },
  run_metadata: { git_branch: 'main', git_commit_sha: 'abc123', total_repetitions: 2 },
  environment: { hostname: 'ci-host' },
  ci: {
    buildkite: {
      build_id: 'bk-build',
      job_id: 'bk-job',
    },
  },
  scores: [
    {
      example: {
        id: 'example-1',
        index: 0,
        input: { question: 'How many alerts?' },
        dataset: {
          id: 'dataset-1',
          name: 'Dataset 1',
        },
      },
      task: {
        trace_id: 'trace-1',
        repetition_index: 0,
        output: { answer: '42' },
      },
      evaluator: {
        name: 'correctness',
        score: 0.95,
        label: 'pass',
        explanation: 'Good answer',
        metadata: { rationale: 'matched expected output' },
        trace_id: null,
      },
    },
  ],
});

const createScoreDocument = (id: string): EvaluationScoreDocument => ({
  '@timestamp': '2026-05-01T11:00:00.000Z',
  run_id: 'run-123',
  experiment_id: 'experiment-1',
  suite: { id: 'suite-a' },
  example: {
    id,
    index: 0,
    input: { question: 'How many alerts?' },
    dataset: {
      id: 'dataset-1',
      name: 'Dataset 1',
    },
  },
  task: {
    trace_id: 'trace-1',
    repetition_index: 0,
    output: { answer: '42' },
    model: { id: 'gpt-4', family: 'gpt', provider: 'openai' },
  },
  evaluator: {
    name: 'correctness',
    score: 0.95,
    label: 'pass',
    explanation: 'Good answer',
    metadata: { rationale: 'matched expected output' },
    trace_id: null,
    model: { id: 'gpt-4o-mini', family: 'gpt', provider: 'openai' },
  },
  run_metadata: {
    git_branch: 'main',
    git_commit_sha: 'abc123',
    total_repetitions: 2,
  },
  environment: {
    hostname: 'ci-host',
  },
});

describe('EvalsClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ingestScores posts to the ingest route and returns parsed counts', async () => {
    const kbnClient = createMockKbnClient();
    const log = createLog();
    kbnClient.request.mockResolvedValue(
      asKbnResponse({ ingested: 1, conflicted: 0, failed: [] }, 200)
    );
    const client = new EvalsClient(kbnClient, log);
    const requestBody = createIngestRequest();

    await expect(client.ingestScores(requestBody)).resolves.toEqual({
      ingested: 1,
      conflicted: 0,
      failed: [],
    });

    expect(kbnClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        path: EVALS_SCORES_URL,
        method: 'POST',
        body: requestBody,
        ignoreErrors: [400, 429, 500],
      })
    );
  });

  it('ingestScores returns partial success payloads without throwing on 207', async () => {
    const kbnClient = createMockKbnClient();
    const log = createLog();
    kbnClient.request.mockResolvedValue(
      asKbnResponse(
        {
          ingested: 1,
          conflicted: 0,
          failed: [{ index: 0, status: 400, reason: 'mapping rejected' }],
        },
        207
      )
    );
    const client = new EvalsClient(kbnClient, log);

    await expect(client.ingestScores(createIngestRequest())).resolves.toEqual({
      ingested: 1,
      conflicted: 0,
      failed: [{ index: 0, status: 400, reason: 'mapping rejected' }],
    });
  });

  it.each([400, 429, 500] as const)(
    'ingestScores throws structured error details on %s responses',
    async (statusCode) => {
      const kbnClient = createMockKbnClient();
      const log = createLog();
      const failureBody = {
        ingested: 0,
        conflicted: 0,
        failed: [{ index: 0, status: statusCode, reason: 'failed' }],
      };
      kbnClient.request.mockResolvedValue(asKbnResponse(failureBody, statusCode));
      const client = new EvalsClient(kbnClient, log);

      await expect(client.ingestScores(createIngestRequest())).rejects.toMatchObject({
        statusCode,
        body: failureBody,
      } satisfies Partial<IngestScoresError>);
    }
  );

  it('getRunStats maps API response to RunStats shape', async () => {
    const kbnClient = createMockKbnClient();
    const log = createLog();
    kbnClient.request.mockResolvedValue(
      asKbnResponse({
        run_id: 'run-123',
        timestamp: '2026-05-01T11:00:00.000Z',
        task_model: { id: 'gpt-4', family: 'gpt', provider: 'openai' },
        evaluator_model: { id: 'gpt-4o-mini', family: 'gpt', provider: 'openai' },
        total_repetitions: 3,
        stats: [
          {
            dataset_id: 'dataset-1',
            dataset_name: 'Dataset 1',
            evaluator_name: 'correctness',
            stats: {
              mean: 0.9,
              median: 0.95,
              std_dev: 0.03,
              min: 0.8,
              max: 1,
              count: 5,
            },
          },
        ],
      })
    );
    const client = new EvalsClient(kbnClient, log);

    const result = await client.getRunStats('run-123', {
      suiteId: 'suite-a',
      taskModelId: 'gpt-4',
    });

    expect(kbnClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        path: EVALS_RUN_URL.replace('{runId}', 'run-123'),
        method: 'GET',
        query: { suite_id: 'suite-a', model_id: 'gpt-4' },
      })
    );
    expect(result).toEqual({
      taskModel: { id: 'gpt-4', family: 'gpt', provider: 'openai' },
      evaluatorModel: { id: 'gpt-4o-mini', family: 'gpt', provider: 'openai' },
      totalRepetitions: 3,
      stats: [
        {
          datasetId: 'dataset-1',
          datasetName: 'Dataset 1',
          evaluatorName: 'correctness',
          stats: {
            mean: 0.9,
            median: 0.95,
            stdDev: 0.03,
            min: 0.8,
            max: 1,
            count: 5,
          },
        },
      ],
    });
  });

  it('getRunScores returns parsed score documents', async () => {
    const kbnClient = createMockKbnClient();
    const log = createLog();
    const scores = [createScoreDocument('example-1'), createScoreDocument('example-2')];
    kbnClient.request.mockResolvedValue(asKbnResponse({ scores, total: scores.length }));
    const client = new EvalsClient(kbnClient, log);

    await expect(client.getRunScores('run-123')).resolves.toEqual(scores);

    expect(kbnClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        path: EVALS_RUN_SCORES_URL.replace('{runId}', 'run-123'),
        method: 'GET',
      })
    );
  });

  it('getRunScores returns [] and logs when response exceeds MAX_SCORES_PER_QUERY', async () => {
    const kbnClient = createMockKbnClient();
    const log = createLog();
    kbnClient.request.mockResolvedValue(
      asKbnResponse({
        scores: [createScoreDocument('example-1')],
        total: MAX_SCORES_PER_QUERY + 1,
      })
    );
    const client = new EvalsClient(kbnClient, log);

    await expect(client.getRunScores('run-123')).resolves.toEqual([]);

    expect(log.error).toHaveBeenCalledWith(
      'Failed to retrieve scores for run ID run-123:',
      expect.objectContaining({
        message: expect.stringContaining('exceeds MAX_SCORES_PER_QUERY'),
      })
    );
  });

  it('assertPluginEnabled throws a clear actionable error when plugin is disabled', async () => {
    const kbnClient = createMockKbnClient();
    const log = createLog();
    (checkEvaluationsPluginEnabled as jest.Mock).mockResolvedValue(false);
    const client = new EvalsClient(kbnClient, log);

    await expect(client.assertPluginEnabled()).rejects.toThrow(
      'Set EVALUATIONS_KBN_URL and ensure xpack.evals.enabled=true on the target Kibana'
    );
  });

  it('assertPluginEnabled resolves when plugin is enabled', async () => {
    const kbnClient = createMockKbnClient();
    const log = createLog();
    (checkEvaluationsPluginEnabled as jest.Mock).mockResolvedValue(true);
    const client = new EvalsClient(kbnClient, log);

    await expect(client.assertPluginEnabled()).resolves.toBeUndefined();
    expect(checkEvaluationsPluginEnabled).toHaveBeenCalledWith({ kbnClient, log });
  });
});
