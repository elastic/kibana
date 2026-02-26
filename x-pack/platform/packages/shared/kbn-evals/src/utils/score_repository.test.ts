/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EvaluationScoreRepository, type EvaluationScoreDocument } from './score_repository';
import type { Model } from '@kbn/inference-common';
import { ModelFamily, ModelProvider } from '@kbn/inference-common';
import type { SomeDevLog } from '@kbn/some-dev-log';

const baseTaskModel: Model = {
  id: 'gpt-4',
  family: ModelFamily.GPT,
  provider: ModelProvider.OpenAI,
};

const baseEvaluatorModel: Model = {
  id: 'claude-3',
  family: ModelFamily.Claude,
  provider: ModelProvider.Anthropic,
};

const createMockScoreDocument = (
  overrides: Partial<EvaluationScoreDocument> = {}
): EvaluationScoreDocument => ({
  '@timestamp': '2025-01-01T00:00:00Z',
  run_id: 'run-123',
  experiment_id: 'exp-1',
  example: {
    id: 'example-1',
    index: 0,
    dataset: {
      id: 'dataset-1',
      name: 'Test Dataset',
    },
  },
  task: {
    trace_id: 'trace-task-123',
    repetition_index: 0,
    model: baseTaskModel,
  },
  evaluator: {
    name: 'Correctness',
    score: 0.85,
    label: 'PASS',
    explanation: 'The response was correct.',
    metadata: { successful: 3, failed: 0 },
    trace_id: 'trace-eval-456',
    model: baseEvaluatorModel,
  },
  run_metadata: {
    git_branch: 'main',
    git_commit_sha: 'abc123',
    total_repetitions: 1,
  },
  environment: {
    hostname: 'test-machine',
  },
  ...overrides,
});

describe('EvaluationScoreRepository', () => {
  let mockEsClient: any;
  let mockLog: jest.Mocked<SomeDevLog>;
  let repository: EvaluationScoreRepository;

  const ENV_KEYS_THAT_AFFECT_EXPORT = [
    'BUILDKITE_BUILD_ID',
    'BUILDKITE_JOB_ID',
    'BUILDKITE_BUILD_URL',
    'BUILDKITE_PIPELINE_SLUG',
    'BUILDKITE_PULL_REQUEST',
    'BUILDKITE_BRANCH',
    'BUILDKITE_COMMIT',
    'EVAL_SUITE_ID',
  ] as const;

  let savedEnv: Partial<Record<(typeof ENV_KEYS_THAT_AFFECT_EXPORT)[number], string | undefined>>;

  beforeEach(() => {
    // Make these unit tests deterministic. On CI, Buildkite env vars are present and will cause
    // score export to enrich documents with `ci.buildkite`/`suite`. That behavior is tested
    // elsewhere; here we keep assertions stable by clearing those env vars.
    savedEnv = {};
    for (const key of ENV_KEYS_THAT_AFFECT_EXPORT) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }

    mockEsClient = {
      indices: {
        existsIndexTemplate: jest.fn().mockResolvedValue(true),
        putIndexTemplate: jest.fn().mockResolvedValue({}),
        getDataStream: jest.fn().mockResolvedValue({}),
        createDataStream: jest.fn().mockResolvedValue({}),
        create: jest.fn(),
        delete: jest.fn(),
      },
      helpers: {
        bulk: jest.fn(),
      },
      search: jest.fn(),
    };

    mockLog = {
      debug: jest.fn(),
      info: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
    } as any;

    repository = new EvaluationScoreRepository(mockEsClient, mockLog);
  });

  afterEach(() => {
    for (const key of ENV_KEYS_THAT_AFFECT_EXPORT) {
      const prev = savedEnv?.[key];
      if (typeof prev === 'string') {
        process.env[key] = prev;
      } else {
        delete process.env[key];
      }
    }
  });

  describe('exportScores', () => {
    const mockDocuments = [
      createMockScoreDocument(),
      createMockScoreDocument({
        example: {
          id: 'example-2',
          index: 1,
          dataset: {
            id: 'dataset-1',
            name: 'Test Dataset',
          },
        },
        evaluator: {
          name: 'Groundedness',
          score: 0.75,
          label: 'PASS',
          explanation: 'The response was grounded.',
          metadata: { successful: 3, failed: 0 },
          trace_id: 'trace-eval-789',
          model: baseEvaluatorModel,
        },
      }),
    ];

    it('should successfully export scores when index template and datastream exist', async () => {
      mockEsClient.helpers.bulk.mockResolvedValue({
        total: 2,
        failed: 0,
        successful: 2,
      } as any);

      await repository.exportScores(mockDocuments);

      expect(mockEsClient.helpers.bulk).toHaveBeenCalledWith(
        expect.objectContaining({
          datasource: mockDocuments,
          refresh: 'wait_for',
        })
      );
      expect(mockLog.debug).toHaveBeenCalledWith(
        expect.stringContaining('Successfully indexed 2 evaluation scores')
      );
    });

    it('should handle empty dataset scores', async () => {
      await repository.exportScores([]);

      expect(mockLog.warning).toHaveBeenCalledWith('No evaluation scores to export');
      expect(mockEsClient.helpers.bulk).not.toHaveBeenCalled();
    });

    it('should throw error if bulk indexing fails', async () => {
      mockEsClient.helpers.bulk.mockResolvedValue({
        total: 2,
        failed: 2,
        successful: 0,
      } as any);

      await expect(repository.exportScores(mockDocuments)).rejects.toThrow(
        'Bulk indexing failed: 2 of 2 operations failed. First error: unknown failure reason'
      );

      expect(mockLog.error).toHaveBeenCalled();
      const errorMessages = mockLog.error.mock.calls.map(([msg]) => msg);
      expect(errorMessages.join('\n')).toContain('Bulk indexing had 2 failed operations out of 2');
    });

    it('should ignore 409 conflicts to keep export idempotent', async () => {
      mockEsClient.helpers.bulk.mockImplementation(async (options: any) => {
        // Simulate re-exporting the same deterministic IDs -> ES returns 409 conflict.
        options.onDrop?.({
          status: 409,
          error: {
            type: 'version_conflict_engine_exception',
            reason: 'document already exists',
          },
        });
        return {
          total: 1,
          failed: 1,
          successful: 0,
        } as any;
      });

      await expect(repository.exportScores([createMockScoreDocument()])).resolves.toBeUndefined();

      const debugMessages = mockLog.debug.mock.calls.map(([arg]) => String(arg));
      expect(debugMessages.join('\n')).toContain('409 conflicts');
      expect(debugMessages.join('\n')).toContain('already existed');
    });

    it('should export multiple documents for multiple evaluators', async () => {
      mockEsClient.helpers.bulk.mockResolvedValue({
        total: 2,
        failed: 0,
        successful: 2,
      } as any);

      await repository.exportScores(mockDocuments);

      const bulkCall = mockEsClient.helpers.bulk.mock.calls[0][0];
      expect(bulkCall.datasource).toHaveLength(2);
      expect(bulkCall.datasource[0].evaluator.name).toBe('Correctness');
      expect(bulkCall.datasource[1].evaluator.name).toBe('Groundedness');
      expect(bulkCall.onDocument(mockDocuments[0])).toEqual({
        create: {
          _index: 'kibana-evaluations',
          _id: 'run-123-unknown-suite-gpt-4-dataset-1-example-1-Correctness-0',
        },
      });
    });

    it('should enrich documents with suite/buildkite via exportScores options', async () => {
      mockEsClient.helpers.bulk.mockResolvedValue({
        total: 1,
        failed: 0,
        successful: 1,
      } as any);

      await repository.exportScores([createMockScoreDocument()], {
        suiteId: 'my-suite',
        buildkite: {
          build_id: 'bk-build-1',
          job_id: 'bk-job-1',
          build_url: 'https://example.test/build/1',
          pipeline_slug: 'my-pipeline',
          pull_request: '123',
          branch: 'feature-branch',
          commit: 'deadbeef',
        },
      });

      const bulkCall = mockEsClient.helpers.bulk.mock.calls[0][0];
      expect(bulkCall.datasource).toHaveLength(1);
      expect(bulkCall.datasource[0].suite).toEqual({ id: 'my-suite' });
      expect(bulkCall.datasource[0].ci?.buildkite).toMatchObject({
        build_id: 'bk-build-1',
        job_id: 'bk-job-1',
        pipeline_slug: 'my-pipeline',
        pull_request: '123',
        branch: 'feature-branch',
        commit: 'deadbeef',
      });
      expect(bulkCall.onDocument(bulkCall.datasource[0])).toEqual({
        create: {
          _index: 'kibana-evaluations',
          _id: 'run-123-my-suite-gpt-4-dataset-1-example-1-Correctness-0',
        },
      });
    });
  });

  describe('getStatsByRunId', () => {
    it('should return stats from aggregations', async () => {
      mockEsClient.search
        .mockResolvedValueOnce({
          hits: { hits: [{ _source: createMockScoreDocument() }] },
        } as any)
        .mockResolvedValueOnce({
          aggregations: {
            by_dataset: {
              buckets: [
                {
                  key: 'dataset-1',
                  dataset_name: { buckets: [{ key: 'Test Dataset' }] },
                  unique_examples: { value: 10 },
                  by_evaluator: {
                    buckets: [
                      {
                        key: 'Correctness',
                        score_stats: {
                          avg: 0.85,
                          std_deviation: 0.1,
                          min: 0.6,
                          max: 1.0,
                          count: 10,
                        },
                        score_median: { values: { '50.0': 0.9 } },
                      },
                    ],
                  },
                },
              ],
            },
          },
        } as any);

      const result = await repository.getStatsByRunId('run-123');

      expect(result?.taskModel).toEqual(baseTaskModel);
      expect(result?.evaluatorModel).toEqual(baseEvaluatorModel);
      expect(result?.totalRepetitions).toBe(1);
      expect(result?.stats[0]).toMatchObject({
        datasetId: 'dataset-1',
        datasetName: 'Test Dataset',
        evaluatorName: 'Correctness',
      });
      expect(result?.stats[0].stats).toMatchObject({
        mean: 0.85,
        median: 0.9,
        stdDev: 0.1,
        min: 0.6,
        max: 1.0,
        count: 10,
      });
    });

    it('should return null when no metadata document is found', async () => {
      mockEsClient.search.mockResolvedValueOnce({ hits: { hits: [] } } as any);

      const result = await repository.getStatsByRunId('run-123');

      expect(result).toBeNull();
    });

    it('should return null on search errors', async () => {
      const error = new Error('Search failed');
      mockEsClient.search.mockRejectedValue(error);

      const result = await repository.getStatsByRunId('run-123');

      expect(result).toBeNull();
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to retrieve stats for run ID run-123:',
        error
      );
    });

    it('should default totalRepetitions to 1 when run_metadata.total_repetitions is missing', async () => {
      const docWithoutRepetitions = createMockScoreDocument({
        run_metadata: {
          git_branch: 'main',
          git_commit_sha: 'abc123',
          total_repetitions: undefined as unknown as number,
        },
      });

      mockEsClient.search
        .mockResolvedValueOnce({
          hits: { hits: [{ _source: docWithoutRepetitions }] },
        } as any)
        .mockResolvedValueOnce({
          aggregations: {
            by_dataset: {
              buckets: [
                {
                  key: 'dataset-1',
                  dataset_name: { buckets: [{ key: 'Test Dataset' }] },
                  unique_examples: { value: 5 },
                  by_evaluator: {
                    buckets: [
                      {
                        key: 'Correctness',
                        score_stats: { avg: 0.8, std_deviation: 0.1, min: 0.5, max: 1.0, count: 5 },
                        score_median: { values: { '50.0': 0.85 } },
                      },
                    ],
                  },
                },
              ],
            },
          },
        } as any);

      const result = await repository.getStatsByRunId('run-123');

      expect(result?.totalRepetitions).toBe(1);
      expect(result?.stats[0].stats.count).toBe(5);
    });
  });

  describe('getScoresByRunId', () => {
    it('should retrieve scores successfully', async () => {
      const mockScores = [createMockScoreDocument()];

      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: mockScores.map((score) => ({ _source: score })),
        },
      } as any);

      const result = await repository.getScoresByRunId('run-123');

      expect(result).toEqual(mockScores);
      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'kibana-evaluations',
          query: {
            bool: {
              must: [{ term: { run_id: 'run-123' } }],
            },
          },
          sort: [
            { 'example.dataset.name': { order: 'asc' } },
            { 'example.index': { order: 'asc' } },
            { 'evaluator.name': { order: 'asc' } },
            { 'task.repetition_index': { order: 'asc' } },
          ],
          size: 10000,
        })
      );
      expect(mockLog.info).toHaveBeenCalledWith('Retrieved 1 scores for run ID: run-123');
    });

    it('should return empty array when no scores found', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [],
        },
      } as any);

      const result = await repository.getScoresByRunId('non-existent-run');

      expect(result).toEqual([]);
      expect(mockLog.info).toHaveBeenCalledWith('Retrieved 0 scores for run ID: non-existent-run');
    });

    it('should handle search errors gracefully', async () => {
      const error = new Error('Search failed');
      mockEsClient.search.mockRejectedValue(error);

      const result = await repository.getScoresByRunId('run-123');

      expect(result).toEqual([]);
      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to retrieve scores for run ID run-123:',
        error
      );
    });
  });
});
