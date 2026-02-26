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
import { EVALS_RUN_URL, API_VERSIONS } from '@kbn/evals-common';
import { registerGetRunRoute } from './get_run';

describe('GET /internal/evals/runs/{runId}', () => {
  const setup = () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    registerGetRunRoute({ router, logger });

    const versionedRouter = router.versioned as MockedVersionedRouter;
    const { handler } = versionedRouter.getRoute('get', EVALS_RUN_URL).versions[
      API_VERSIONS.internal.v1
    ];

    const mockCoreContext = coreMock.createRequestHandlerContext();
    const context = coreMock.createCustomRequestHandlerContext({ core: mockCoreContext });
    const esClient = mockCoreContext.elasticsearch.client.asCurrentUser;

    return { handler, context, esClient, logger };
  };

  const makeRequest = (runId = 'run-abc') =>
    httpServerMock.createKibanaRequest({
      method: 'get',
      path: EVALS_RUN_URL.replace('{runId}', runId),
      params: { runId },
      query: {},
    });

  it('returns 404 when no documents match the run', async () => {
    const { handler, context, esClient } = setup();
    esClient.search.mockResolvedValueOnce({ hits: { hits: [] } } as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(404);
    expect(response.payload).toEqual({ message: 'Run not found: run-abc' });
  });

  it('returns run detail with stats on success', async () => {
    const { handler, context, esClient } = setup();

    // First search: metadata doc
    esClient.search.mockResolvedValueOnce({
      hits: {
        hits: [
          {
            _source: {
              task: { model: { id: 'gpt-4', family: 'gpt-4', provider: 'openai' } },
              evaluator: { model: { id: 'claude-3', family: 'claude-3', provider: 'anthropic' } },
              run_metadata: { total_repetitions: 3 },
            },
          },
        ],
      },
    } as any);

    // Second search: aggregations
    esClient.search.mockResolvedValueOnce({
      aggregations: {
        by_dataset: {
          buckets: [
            {
              key: 'dataset-1',
              dataset_name: { buckets: [{ key: 'My Dataset' }] },
              by_evaluator: {
                buckets: [
                  {
                    key: 'correctness',
                    score_stats: { avg: 0.85, std_deviation: 0.1, min: 0.5, max: 1.0, count: 10 },
                    score_median: { values: { '50.0': 0.9 } },
                  },
                ],
              },
            },
          ],
        },
      },
    } as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload.run_id).toBe('run-abc');
    expect(response.payload.task_model.id).toBe('gpt-4');
    expect(response.payload.evaluator_model.id).toBe('claude-3');
    expect(response.payload.total_repetitions).toBe(3);
    expect(response.payload.stats).toHaveLength(1);
    expect(response.payload.stats[0]).toEqual({
      dataset_id: 'dataset-1',
      dataset_name: 'My Dataset',
      evaluator_name: 'correctness',
      stats: {
        mean: 0.85,
        median: 0.9,
        std_dev: 0.1,
        min: 0.5,
        max: 1.0,
        count: 10,
      },
    });
  });

  it('returns 500 when ES throws', async () => {
    const { handler, context, esClient, logger } = setup();
    esClient.search.mockRejectedValueOnce(new Error('ES error'));

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(500);
    expect(logger.error).toHaveBeenCalled();
  });
});
