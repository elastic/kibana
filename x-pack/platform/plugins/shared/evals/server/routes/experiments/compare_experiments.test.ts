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
import { EVALS_EXPERIMENTS_COMPARE_URL, API_VERSIONS, type Direction } from '@kbn/evals-common';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { createEvaluatorRegistryMock } from '../../evaluators/registry.mock';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { registerCompareExperimentsRoute } from './compare_experiments';

const makeScoreDoc = ({
  experimentId = 'experiment-a',
  datasetId = 'ds-1',
  datasetName = 'Dataset 1',
  exampleId = 'ex-1',
  evaluatorName = 'Correctness',
  score = 0.8,
  repetitionIndex = 0,
  direction,
}: {
  experimentId?: string;
  datasetId?: string;
  datasetName?: string;
  exampleId?: string;
  evaluatorName?: string;
  score?: number | null;
  repetitionIndex?: number;
  direction?: Direction;
} = {}) => ({
  '@timestamp': '2025-01-01T00:00:00Z',
  experiment_id: experimentId,
  example: {
    id: exampleId,
    index: 0,
    dataset: { id: datasetId, name: datasetName },
  },
  task: {
    repetition_index: repetitionIndex,
    model: { id: 'gpt-4', family: 'gpt', provider: 'openai' },
    output: {},
  },
  evaluator: {
    name: evaluatorName,
    score,
    label: 'PASS',
    explanation: null,
    metadata: null,
    trace_id: null,
    ...(direction !== undefined && { direction }),
    model: { id: 'claude-3', family: 'claude', provider: 'anthropic' },
  },
  metadata: {
    execution_id: experimentId,
    git: {
      branch: 'main',
      commit_sha: 'abc123',
    },
    total_repetitions: 1,
    hostname: 'test',
  },
});

describe('GET /internal/evals/experiments/compare', () => {
  const setup = () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    registerCompareExperimentsRoute({
      router,
      logger,
      canEncrypt: false,
      evaluatorRegistry: createEvaluatorRegistryMock(),
      getInferenceStart: async () => ({ getClient: jest.fn() } as unknown as InferenceServerStart),
      getEncryptedSavedObjectsStart: async () => encryptedSavedObjectsMock.createStart(),
      getInternalRemoteConfigsSoClient: async () => savedObjectsClientMock.create(),
    });

    const versionedRouter = router.versioned as MockedVersionedRouter;
    const { handler } = versionedRouter.getRoute('get', EVALS_EXPERIMENTS_COMPARE_URL).versions[
      API_VERSIONS.internal.v1
    ];

    const evaluationScoreService = {
      search: jest.fn().mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      }),
    };
    const context = coreMock.createCustomRequestHandlerContext({
      evals: {
        evaluationScoreService,
      } as any,
    });

    return { handler, context, evaluationScoreService, logger };
  };

  const makeRequest = (baselineId = 'experiment-a', targetId = 'experiment-b') =>
    httpServerMock.createKibanaRequest({
      method: 'get',
      path: EVALS_EXPERIMENTS_COMPARE_URL,
      query: { type: 'experiment', baseline_id: baselineId, target_id: targetId },
    });

  it('queries both experiments through evaluationScoreService.search', async () => {
    const { handler, context, evaluationScoreService } = setup();
    evaluationScoreService.search.mockResolvedValue({
      hits: { hits: [], total: { value: 0, relation: 'eq' } },
    } as any);

    await handler(context, makeRequest(), kibanaResponseFactory);

    expect(evaluationScoreService.search).toHaveBeenCalledTimes(2);
    expect(evaluationScoreService.search).toHaveBeenCalledWith(
      expect.objectContaining({
        _source: expect.arrayContaining([
          'evaluator.name',
          'evaluator.score',
          'evaluator.direction',
        ]),
      })
    );
  });

  it('returns 400 without querying when baseline and target are the same', async () => {
    const { handler, context, evaluationScoreService } = setup();

    const response = await handler(
      context,
      makeRequest('experiment-a', 'experiment-a'),
      kibanaResponseFactory
    );

    expect(response.status).toBe(400);
    expect(response.payload.message).toContain('must differ');
    expect(evaluationScoreService.search).not.toHaveBeenCalled();
  });

  it('returns 404 when no scores exist for the first experiment', async () => {
    const { handler, context, evaluationScoreService } = setup();
    evaluationScoreService.search
      .mockResolvedValueOnce({ hits: { hits: [], total: { value: 0, relation: 'eq' } } } as any)
      .mockResolvedValueOnce({
        hits: {
          hits: [{ _source: makeScoreDoc({ experimentId: 'experiment-b' }) }],
          total: { value: 1, relation: 'eq' },
        },
      } as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(404);
    expect(response.payload.message).toContain('experiment-a');
  });

  it('returns 404 when no scores exist for the second experiment', async () => {
    const { handler, context, evaluationScoreService } = setup();
    evaluationScoreService.search
      .mockResolvedValueOnce({
        hits: {
          hits: [{ _source: makeScoreDoc({ experimentId: 'experiment-a' }) }],
          total: { value: 1, relation: 'eq' },
        },
      } as any)
      .mockResolvedValueOnce({ hits: { hits: [], total: { value: 0, relation: 'eq' } } } as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(404);
    expect(response.payload.message).toContain('experiment-b');
  });

  it('returns empty results when datasets do not overlap', async () => {
    const { handler, context, evaluationScoreService } = setup();
    evaluationScoreService.search
      .mockResolvedValueOnce({
        hits: {
          hits: [{ _source: makeScoreDoc({ datasetId: 'ds-only-a' }) }],
          total: { value: 1, relation: 'eq' },
        },
      } as any)
      .mockResolvedValueOnce({
        hits: {
          hits: [{ _source: makeScoreDoc({ datasetId: 'ds-only-b' }) }],
          total: { value: 1, relation: 'eq' },
        },
      } as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload.results).toEqual([]);
    expect(response.payload.pairing.totalPairs).toBe(0);
    expect(response.payload.pairing.truncatedBaseline).toBe(false);
    expect(response.payload.pairing.truncatedTarget).toBe(false);
  });

  it('returns comparison results with pairing stats for overlapping datasets', async () => {
    const { handler, context, evaluationScoreService } = setup();
    const sharedDataset = { datasetId: 'ds-shared', datasetName: 'Shared' };
    evaluationScoreService.search
      .mockResolvedValueOnce({
        hits: {
          hits: [
            { _source: makeScoreDoc({ ...sharedDataset, exampleId: 'ex-1', score: 0.9 }) },
            { _source: makeScoreDoc({ ...sharedDataset, exampleId: 'ex-2', score: 0.7 }) },
          ],
          total: { value: 2, relation: 'eq' },
        },
      } as any)
      .mockResolvedValueOnce({
        hits: {
          hits: [
            { _source: makeScoreDoc({ ...sharedDataset, exampleId: 'ex-1', score: 0.5 }) },
            { _source: makeScoreDoc({ ...sharedDataset, exampleId: 'ex-2', score: 0.3 }) },
          ],
          total: { value: 2, relation: 'eq' },
        },
      } as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload.results).toHaveLength(1);
    expect(response.payload.results[0].datasetId).toBe('ds-shared');
    expect(response.payload.results[0].evaluatorName).toBe('Correctness');
    expect(response.payload.results[0].sampleSize).toBe(2);
    expect(response.payload.results[0].direction).toBe('maximize');
    expect(response.payload.results[0].meanTarget).toBeCloseTo(0.4);
    expect(response.payload.results[0].meanBaseline).toBeCloseTo(0.8);
    expect(response.payload.pairing.totalPairs).toBe(2);
    expect(response.payload.pairing.skippedMissingPairs).toBe(0);
    expect(response.payload.pairing.skippedNullScores).toBe(0);
    expect(response.payload.pairing.truncatedBaseline).toBe(false);
    expect(response.payload.pairing.truncatedTarget).toBe(false);
  });

  it('returns direction: minimize for lower-is-better evaluator metadata', async () => {
    const { handler, context, evaluationScoreService } = setup();
    const sharedDataset = {
      datasetId: 'ds-shared',
      datasetName: 'Shared',
      evaluatorName: 'Latency',
      direction: 'minimize' as const,
    };
    evaluationScoreService.search
      .mockResolvedValueOnce({
        hits: {
          hits: [
            { _source: makeScoreDoc({ ...sharedDataset, exampleId: 'ex-1', score: 150 }) },
            { _source: makeScoreDoc({ ...sharedDataset, exampleId: 'ex-2', score: 200 }) },
          ],
          total: { value: 2, relation: 'eq' },
        },
      } as any)
      .mockResolvedValueOnce({
        hits: {
          hits: [
            { _source: makeScoreDoc({ ...sharedDataset, exampleId: 'ex-1', score: 100 }) },
            { _source: makeScoreDoc({ ...sharedDataset, exampleId: 'ex-2', score: 120 }) },
          ],
          total: { value: 2, relation: 'eq' },
        },
      } as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload.results).toHaveLength(1);
    expect(response.payload.results[0].evaluatorName).toBe('Latency');
    expect(response.payload.results[0].direction).toBe('minimize');
  });

  it('uses metadata over name heuristic for Error handling quality', async () => {
    const { handler, context, evaluationScoreService } = setup();
    const sharedDataset = {
      datasetId: 'ds-shared',
      datasetName: 'Shared',
      evaluatorName: 'Error handling quality',
      direction: 'maximize' as const,
    };
    evaluationScoreService.search
      .mockResolvedValueOnce({
        hits: {
          hits: [{ _source: makeScoreDoc({ ...sharedDataset, exampleId: 'ex-1', score: 0.4 }) }],
          total: { value: 1, relation: 'eq' },
        },
      } as any)
      .mockResolvedValueOnce({
        hits: {
          hits: [{ _source: makeScoreDoc({ ...sharedDataset, exampleId: 'ex-1', score: 0.8 }) }],
          total: { value: 1, relation: 'eq' },
        },
      } as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload.results[0].evaluatorName).toBe('Error handling quality');
    // Name regex would treat "Error" as lower-is-better; metadata must win.
    expect(response.payload.results[0].direction).toBe('maximize');
  });

  it('filters out hits with no _source', async () => {
    const { handler, context, evaluationScoreService } = setup();
    const sharedDataset = { datasetId: 'ds-1', datasetName: 'DS' };
    evaluationScoreService.search
      .mockResolvedValueOnce({
        hits: {
          hits: [
            { _source: makeScoreDoc({ ...sharedDataset, score: 0.8 }) },
            { _source: undefined },
          ],
          total: { value: 2, relation: 'eq' },
        },
      } as any)
      .mockResolvedValueOnce({
        hits: {
          hits: [{ _source: makeScoreDoc({ ...sharedDataset, score: 0.6 }) }],
          total: { value: 1, relation: 'eq' },
        },
      } as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload.results).toHaveLength(1);
    expect(response.payload.pairing.totalPairs).toBe(1);
  });

  it('reports truncation when total hits exceed the fetch limit', async () => {
    const { handler, context, evaluationScoreService } = setup();
    const sharedDataset = { datasetId: 'ds-1', datasetName: 'DS' };
    evaluationScoreService.search
      .mockResolvedValueOnce({
        hits: {
          hits: [{ _source: makeScoreDoc({ ...sharedDataset, score: 0.8 }) }],
          total: { value: 15_000, relation: 'eq' },
        },
      } as any)
      .mockResolvedValueOnce({
        hits: {
          hits: [{ _source: makeScoreDoc({ ...sharedDataset, score: 0.6 }) }],
          total: { value: 5_000, relation: 'eq' },
        },
      } as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload.pairing.truncatedBaseline).toBe(true);
    expect(response.payload.pairing.truncatedTarget).toBe(false);
  });

  it('returns 500 when ES throws', async () => {
    const { handler, context, evaluationScoreService, logger } = setup();
    evaluationScoreService.search.mockRejectedValueOnce(new Error('ES error'));

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(500);
    expect(logger.error).toHaveBeenCalled();
  });
});
