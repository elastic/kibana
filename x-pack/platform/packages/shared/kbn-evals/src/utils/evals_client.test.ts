/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { SomeDevLog } from '@kbn/some-dev-log';
import {
  EVALS_DATASET_UPSERT_URL,
  EVALS_DATASET_URL,
  EVALS_EXPERIMENT_SCORES_URL,
  EVALS_EXPERIMENT_URL,
  EVALS_SCORES_URL,
  MAX_SCORES_PER_QUERY,
  type EvaluationScoreDocument,
  type IngestScoresRequestBodyInput,
} from '@kbn/evals-common';
import type { IngestScoresError, UpsertDatasetInput } from './evals_client';
import { EvalsClient } from './evals_client';

const createMockKbnClient = (): jest.Mocked<KbnClient> =>
  ({
    request: jest.fn(),
  } as unknown as jest.Mocked<KbnClient>);

const asKbnResponse = <T>(value: T, status = 200): Awaited<ReturnType<KbnClient['request']>> =>
  ({ data: value, status, statusText: 'OK', headers: new Headers() } as unknown as Awaited<
    ReturnType<KbnClient['request']>
  >);

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
  experiment_id: 'experiment-1',
  task_model: { id: 'gpt-4', family: 'gpt', provider: 'openai' },
  evaluator_model: { id: 'gpt-4o-mini', family: 'gpt', provider: 'openai' },
  metadata: {
    execution_id: 'execution-1',
    suite_id: 'suite-a',
    total_repetitions: 2,
    hostname: 'ci-host',
    git: { branch: 'main', commit_sha: 'abc123' },
    ci: {
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
  experiment_id: 'experiment-1',
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
  metadata: {
    execution_id: 'execution-1',
    suite_id: 'suite-a',
    total_repetitions: 2,
    hostname: 'ci-host',
    git: { branch: 'main', commit_sha: 'abc123' },
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

  it('getExperimentStats maps API response to ExperimentStats shape', async () => {
    const kbnClient = createMockKbnClient();
    const log = createLog();
    kbnClient.request.mockResolvedValue(
      asKbnResponse({
        experiment_id: 'experiment-123',
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

    const result = await client.getExperimentStats('experiment-123', {
      suiteId: 'suite-a',
      taskModelId: 'gpt-4',
    });

    expect(kbnClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        path: EVALS_EXPERIMENT_URL.replace('{experimentId}', 'experiment-123'),
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

  it('getExperimentScores returns parsed score documents', async () => {
    const kbnClient = createMockKbnClient();
    const log = createLog();
    const scores = [createScoreDocument('example-1'), createScoreDocument('example-2')];
    kbnClient.request.mockResolvedValue(asKbnResponse({ scores, total: scores.length }));
    const client = new EvalsClient(kbnClient, log);

    await expect(client.getExperimentScores('experiment-123')).resolves.toEqual(scores);

    expect(kbnClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        path: EVALS_EXPERIMENT_SCORES_URL.replace('{experimentId}', 'experiment-123'),
        method: 'GET',
      })
    );
  });

  it('getExperimentScores returns [] and logs when response exceeds MAX_SCORES_PER_QUERY', async () => {
    const kbnClient = createMockKbnClient();
    const log = createLog();
    kbnClient.request.mockResolvedValue(
      asKbnResponse({
        scores: [createScoreDocument('example-1')],
        total: MAX_SCORES_PER_QUERY + 1,
      })
    );
    const client = new EvalsClient(kbnClient, log);

    await expect(client.getExperimentScores('experiment-123')).resolves.toEqual([]);

    expect(log.error).toHaveBeenCalledWith(
      'Failed to retrieve scores for experiment ID experiment-123:',
      expect.objectContaining({
        message: expect.stringContaining('exceeds MAX_SCORES_PER_QUERY'),
      })
    );
  });

  it('upsertDataset posts to the upsert route', async () => {
    const kbnClient = createMockKbnClient();
    const log = createLog();
    kbnClient.request.mockResolvedValue(
      asKbnResponse({ dataset_id: 'ds-1', added: 2, removed: 0, unchanged: 0 })
    );
    const client = new EvalsClient(kbnClient, log);

    const dataset: UpsertDatasetInput = {
      name: 'My Dataset',
      description: 'Test dataset',
      examples: [
        { input: { question: 'What?' }, output: { answer: '42' } },
        { input: { question: 'Why?' } },
      ],
    };

    await expect(client.upsertDataset(dataset)).resolves.toBeUndefined();
    expect(kbnClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        path: EVALS_DATASET_UPSERT_URL,
        method: 'POST',
        body: {
          name: 'My Dataset',
          description: 'Test dataset',
          examples: dataset.examples,
        },
        retries: 0,
      })
    );
  });

  it('upsertDataset propagates errors', async () => {
    const kbnClient = createMockKbnClient();
    const log = createLog();
    kbnClient.request.mockRejectedValue(new Error('Server error'));
    const client = new EvalsClient(kbnClient, log);

    await expect(
      client.upsertDataset({ name: 'ds', description: '', examples: [] })
    ).rejects.toThrow('Server error');
  });

  it('getDatasetByName returns parsed dataset', async () => {
    const kbnClient = createMockKbnClient();
    const log = createLog();
    kbnClient.request.mockResolvedValue(
      asKbnResponse({
        id: 'ds-uuid',
        name: 'My Dataset',
        description: 'Test dataset',
        examples: [
          {
            id: 'ex-1',
            input: { question: 'What?' },
            output: { answer: '42' },
            metadata: {},
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
        ],
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      })
    );
    const client = new EvalsClient(kbnClient, log);

    const result = await client.getDatasetByName('My Dataset');

    expect(kbnClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringContaining(EVALS_DATASET_URL.split('{')[0]),
        method: 'GET',
        retries: 0,
      })
    );
    expect(result).toEqual({
      id: 'ds-uuid',
      name: 'My Dataset',
      description: 'Test dataset',
      examples: [
        { id: 'ex-1', input: { question: 'What?' }, output: { answer: '42' }, metadata: {} },
      ],
    });
  });

  it('getDatasetByName returns null on 404', async () => {
    const kbnClient = createMockKbnClient();
    const log = createLog();
    kbnClient.request.mockRejectedValue(Object.assign(new Error('Not Found'), { status: 404 }));
    const client = new EvalsClient(kbnClient, log);

    await expect(client.getDatasetByName('Nonexistent')).resolves.toBeNull();
  });

  it('getDatasetByName propagates non-404 errors', async () => {
    const kbnClient = createMockKbnClient();
    const log = createLog();
    kbnClient.request.mockRejectedValue(
      Object.assign(new Error('Internal Server Error'), { status: 500 })
    );
    const client = new EvalsClient(kbnClient, log);

    await expect(client.getDatasetByName('Some Dataset')).rejects.toThrow('Internal Server Error');
  });

  it('assertPluginEnabled throws an error when plugin is disabled', async () => {
    const kbnClient = createMockKbnClient();
    const log = createLog();
    kbnClient.request.mockRejectedValue(Object.assign(new Error('Not Found'), { status: 404 }));
    const client = new EvalsClient(kbnClient, log);

    await expect(client.assertPluginEnabled()).rejects.toThrow(
      'Evaluations plugin is not enabled on the target Kibana. Ensure xpack.evals.enabled=true is set in the Kibana configuration.'
    );
  });

  it('assertPluginEnabled resolves when plugin is enabled', async () => {
    const kbnClient = createMockKbnClient();
    const log = createLog();
    kbnClient.request.mockResolvedValue(asKbnResponse({ datasets: [], total: 0 }));
    const client = new EvalsClient(kbnClient, log);

    await expect(client.assertPluginEnabled()).resolves.toBeUndefined();
    expect(kbnClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/internal/evals/datasets',
        method: 'GET',
        query: { page: 1, per_page: 1 },
        retries: 0,
      })
    );
  });
});
