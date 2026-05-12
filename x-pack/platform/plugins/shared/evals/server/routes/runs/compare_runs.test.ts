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
import { EVALS_RUNS_COMPARE_URL, API_VERSIONS, EVALUATIONS_INDEX_PATTERN } from '@kbn/evals-common';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { registerCompareRunsRoute } from './compare_runs';

const makeScoreDoc = ({
  runId = 'run-a',
  datasetId = 'ds-1',
  datasetName = 'Dataset 1',
  exampleId = 'ex-1',
  evaluatorName = 'Correctness',
  score = 0.8,
  repetitionIndex = 0,
}: {
  runId?: string;
  datasetId?: string;
  datasetName?: string;
  exampleId?: string;
  evaluatorName?: string;
  score?: number | null;
  repetitionIndex?: number;
} = {}) => ({
  '@timestamp': '2025-01-01T00:00:00Z',
  run_id: runId,
  experiment_id: 'exp-1',
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
    model: { id: 'claude-3', family: 'claude', provider: 'anthropic' },
  },
  run_metadata: {
    git_branch: 'main',
    git_commit_sha: 'abc123',
    total_repetitions: 1,
  },
  environment: { hostname: 'test' },
});

describe('GET /internal/evals/runs/compare', () => {
  const setup = () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    registerCompareRunsRoute({
      router,
      logger,
      canEncrypt: false,
      getEncryptedSavedObjectsStart: async () => encryptedSavedObjectsMock.createStart(),
      getInternalRemoteConfigsSoClient: async () => savedObjectsClientMock.create(),
    });

    const versionedRouter = router.versioned as MockedVersionedRouter;
    const { handler } = versionedRouter.getRoute('get', EVALS_RUNS_COMPARE_URL).versions[
      API_VERSIONS.internal.v1
    ];

    const mockCoreContext = coreMock.createRequestHandlerContext();
    const context = coreMock.createCustomRequestHandlerContext({ core: mockCoreContext });
    const esClient = mockCoreContext.elasticsearch.client.asCurrentUser;

    return { handler, context, esClient, logger };
  };

  const makeRequest = (runIdA = 'run-a', runIdB = 'run-b') =>
    httpServerMock.createKibanaRequest({
      method: 'get',
      path: EVALS_RUNS_COMPARE_URL,
      query: { run_id_a: runIdA, run_id_b: runIdB },
    });

  it('queries the correct index for both runs', async () => {
    const { handler, context, esClient } = setup();
    esClient.search.mockResolvedValue({
      hits: { hits: [], total: { value: 0, relation: 'eq' } },
    } as any);

    await handler(context, makeRequest(), kibanaResponseFactory);

    expect(esClient.search).toHaveBeenCalledTimes(2);
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ index: EVALUATIONS_INDEX_PATTERN })
    );
  });

  it('returns 404 when no scores exist for the first run', async () => {
    const { handler, context, esClient } = setup();
    esClient.search
      .mockResolvedValueOnce({ hits: { hits: [], total: { value: 0, relation: 'eq' } } } as any)
      .mockResolvedValueOnce({
        hits: {
          hits: [{ _source: makeScoreDoc({ runId: 'run-b' }) }],
          total: { value: 1, relation: 'eq' },
        },
      } as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(404);
    expect(response.payload.message).toContain('run-a');
  });

  it('returns 404 when no scores exist for the second run', async () => {
    const { handler, context, esClient } = setup();
    esClient.search
      .mockResolvedValueOnce({
        hits: {
          hits: [{ _source: makeScoreDoc({ runId: 'run-a' }) }],
          total: { value: 1, relation: 'eq' },
        },
      } as any)
      .mockResolvedValueOnce({ hits: { hits: [], total: { value: 0, relation: 'eq' } } } as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(404);
    expect(response.payload.message).toContain('run-b');
  });

  it('returns empty results when datasets do not overlap', async () => {
    const { handler, context, esClient } = setup();
    esClient.search
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
    expect(response.payload.pairing.truncatedA).toBe(false);
    expect(response.payload.pairing.truncatedB).toBe(false);
  });

  it('returns comparison results with pairing stats for overlapping datasets', async () => {
    const { handler, context, esClient } = setup();
    const sharedDataset = { datasetId: 'ds-shared', datasetName: 'Shared' };
    esClient.search
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
    expect(response.payload.pairing.totalPairs).toBe(2);
    expect(response.payload.pairing.skippedMissingPairs).toBe(0);
    expect(response.payload.pairing.skippedNullScores).toBe(0);
    expect(response.payload.pairing.truncatedA).toBe(false);
    expect(response.payload.pairing.truncatedB).toBe(false);
  });

  it('filters out hits with no _source', async () => {
    const { handler, context, esClient } = setup();
    const sharedDataset = { datasetId: 'ds-1', datasetName: 'DS' };
    esClient.search
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
    const { handler, context, esClient } = setup();
    const sharedDataset = { datasetId: 'ds-1', datasetName: 'DS' };
    esClient.search
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
    expect(response.payload.pairing.truncatedA).toBe(true);
    expect(response.payload.pairing.truncatedB).toBe(false);
  });

  it('returns 500 when ES throws', async () => {
    const { handler, context, esClient, logger } = setup();
    esClient.search.mockRejectedValueOnce(new Error('ES error'));

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(500);
    expect(logger.error).toHaveBeenCalled();
  });
});
