/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { MockedVersionedRouter } from '@kbn/core-http-router-server-mocks';
import { EVALS_EXPERIMENT_PROTOCOL_URL, API_VERSIONS } from '@kbn/evals-common';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { createEvaluatorRegistryMock } from '../../evaluators/registry.mock';
import { registerGetExperimentProtocolRoute } from './get_experiment_protocol';

describe('GET /internal/evals/experiments/{experimentId}/protocol', () => {
  const setup = () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    registerGetExperimentProtocolRoute({
      router,
      logger,
      canEncrypt: false,
      evaluatorRegistry: createEvaluatorRegistryMock(),
      getInferenceStart: async () => ({ getClient: jest.fn() } as unknown as InferenceServerStart),
      getEncryptedSavedObjectsStart: async () => encryptedSavedObjectsMock.createStart(),
      getInternalRemoteConfigsSoClient: async () => savedObjectsClientMock.create(),
    });

    const versionedRouter = router.versioned as MockedVersionedRouter;
    const { handler } = versionedRouter.getRoute('get', EVALS_EXPERIMENT_PROTOCOL_URL).versions[
      API_VERSIONS.internal.v1
    ];

    const evaluationScoreService = {
      search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
    };
    const context = coreMock.createCustomRequestHandlerContext({
      evals: { evaluationScoreService } as any,
    });

    return { handler, context, evaluationScoreService, logger };
  };

  const makeRequest = (query: Record<string, string> = {}, experimentId = 'experiment-abc') =>
    httpServerMock.createKibanaRequest({
      method: 'get',
      path: EVALS_EXPERIMENT_PROTOCOL_URL.replace('{experimentId}', experimentId),
      params: { experimentId },
      query,
    });

  const searchResponse = ({ evaluatorBuckets }: { evaluatorBuckets?: unknown[] } = {}) => ({
    hits: {
      hits: [
        {
          _source: {
            experiment_name: 'My experiment',
            task: { model: { id: 'gpt-4', family: 'gpt-4', provider: 'openai' } },
            metadata: {
              execution_id: 'exec-1',
              suite_id: 'suite-1',
              hostname: 'worker-01',
              git: { branch: 'main', commit_sha: 'abc123' },
              ci: { build_url: 'https://ci.example/build/1' },
            },
          },
        },
      ],
    },
    aggregations: {
      first_score: { value_as_string: '2026-08-01T00:00:00.000Z' },
      last_score: { value_as_string: '2026-08-01T00:10:00.000Z' },
      total_repetitions: { value: 2 },
      datasets: {
        buckets: [
          {
            key: 'dataset-1',
            dataset_name: { buckets: [{ key: 'My Dataset' }] },
            example_count: { value: 3 },
          },
        ],
      },
      evaluators: {
        buckets: evaluatorBuckets ?? [
          {
            key: 'correctness',
            doc_count: 6,
            version: { buckets: [{ key: '2' }] },
            kind: { buckets: [{ key: 'llm' }] },
            model_id: {
              buckets: [
                {
                  key: 'claude-3',
                  family: { buckets: [{ key: 'Claude' }] },
                  provider: { buckets: [{ key: 'Anthropic' }] },
                },
              ],
            },
          },
          {
            key: 'latency',
            doc_count: 6,
            version: { buckets: [] },
            kind: { buckets: [{ key: 'code' }] },
            model_id: { buckets: [] },
          },
        ],
      },
    },
  });

  it('returns 404 when no documents match the experiment', async () => {
    const { handler, context, evaluationScoreService } = setup();
    evaluationScoreService.search.mockResolvedValueOnce({ hits: { hits: [] } } as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(404);
    expect(response.payload).toEqual({
      message: 'Experiment not found for experiment: experiment-abc',
    });
  });

  it('returns protocol and execution sections derived from score documents', async () => {
    const { handler, context, evaluationScoreService } = setup();
    evaluationScoreService.search.mockResolvedValueOnce(searchResponse() as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload.experiment_id).toBe('experiment-abc');
    expect(response.payload.protocol).toEqual({
      experiment_name: 'My experiment',
      task_model: { id: 'gpt-4', family: 'gpt-4', provider: 'openai' },
      total_repetitions: 2,
      datasets: [{ id: 'dataset-1', name: 'My Dataset', evaluated_example_count: 3 }],
      evaluators: [
        {
          name: 'correctness',
          version: '2',
          kind: 'llm',
          model: { id: 'claude-3', family: 'Claude', provider: 'Anthropic' },
          score_count: 6,
        },
        { name: 'latency', version: undefined, kind: 'code', score_count: 6 },
      ],
    });
    expect(response.payload.execution).toEqual({
      execution_id: 'exec-1',
      suite_id: 'suite-1',
      first_score_at: '2026-08-01T00:00:00.000Z',
      last_score_at: '2026-08-01T00:10:00.000Z',
      git_branch: 'main',
      git_commit_sha: 'abc123',
      ci: { build_url: 'https://ci.example/build/1' },
      hostname: 'worker-01',
    });
  });

  it('never attributes a model to a code evaluator, even when its buckets carry one', async () => {
    const { handler, context, evaluationScoreService } = setup();
    evaluationScoreService.search.mockResolvedValueOnce(
      searchResponse({
        evaluatorBuckets: [
          {
            key: 'latency',
            doc_count: 6,
            version: { buckets: [] },
            kind: { buckets: [{ key: 'code' }] },
            // A stray model bucket (e.g. from legacy documents) must not be attributed.
            model_id: { buckets: [{ key: 'claude-3' }] },
          },
        ],
      }) as any
    );

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload.protocol.evaluators).toEqual([
      { name: 'latency', version: undefined, kind: 'code', score_count: 6 },
    ]);
  });

  it('filters by suite_id, model_id, and space', async () => {
    const { handler, context, evaluationScoreService } = setup();
    evaluationScoreService.search.mockResolvedValueOnce(searchResponse() as any);

    await handler(
      context,
      makeRequest({ suite_id: 'suite-1', model_id: 'gpt-4' }),
      kibanaResponseFactory
    );

    const { query } = evaluationScoreService.search.mock.calls[0][0];
    expect(query.bool.must).toEqual(
      expect.arrayContaining([
        { term: { experiment_id: 'experiment-abc' } },
        { term: { 'metadata.suite_id': 'suite-1' } },
        { term: { 'task.model.id': 'gpt-4' } },
      ])
    );
  });

  it('returns 500 when ES throws', async () => {
    const { handler, context, evaluationScoreService, logger } = setup();
    evaluationScoreService.search.mockRejectedValueOnce(new Error('ES error'));

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(500);
    expect(logger.error).toHaveBeenCalled();
  });
});
