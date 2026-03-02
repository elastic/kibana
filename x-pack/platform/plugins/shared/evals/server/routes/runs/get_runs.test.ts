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
import { EVALS_RUNS_URL, API_VERSIONS, EVALUATIONS_INDEX_PATTERN } from '@kbn/evals-common';
import { registerGetRunsRoute } from './get_runs';

describe('GET /internal/evals/runs', () => {
  const setup = () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    registerGetRunsRoute({ router, logger });

    const versionedRouter = router.versioned as MockedVersionedRouter;
    const { handler } = versionedRouter.getRoute('get', EVALS_RUNS_URL).versions[
      API_VERSIONS.internal.v1
    ];

    const mockCoreContext = coreMock.createRequestHandlerContext();
    const context = coreMock.createCustomRequestHandlerContext({ core: mockCoreContext });
    const esClient = mockCoreContext.elasticsearch.client.asCurrentUser;

    return { handler, context, esClient, logger };
  };

  it('calls esClient.search with correct index and size 0', async () => {
    const { handler, context, esClient } = setup();
    esClient.search.mockResolvedValueOnce({
      aggregations: { total_runs: { value: 0 }, runs: { buckets: [] } },
    } as any);

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: EVALS_RUNS_URL,
      query: { page: 1, per_page: 25 },
    });

    await handler(context, request, kibanaResponseFactory);

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: EVALUATIONS_INDEX_PATTERN,
        size: 0,
      })
    );
  });

  it('returns parsed runs listing on success', async () => {
    const { handler, context, esClient } = setup();
    esClient.search.mockResolvedValueOnce({
      aggregations: {
        total_runs: { value: 1 },
        runs: {
          buckets: [
            {
              key: 'run-abc',
              doc_count: 5,
              latest_timestamp: { value_as_string: '2025-06-01T00:00:00Z' },
              suite_id: { buckets: [{ key: 'suite-1' }] },
              task_model_id: { buckets: [{ key: 'gpt-4' }] },
              task_model_family: { buckets: [{ key: 'gpt-4' }] },
              task_model_provider: { buckets: [{ key: 'openai' }] },
              evaluator_model_id: { buckets: [{ key: 'claude-3' }] },
              evaluator_model_family: { buckets: [{ key: 'claude-3' }] },
              evaluator_model_provider: { buckets: [{ key: 'anthropic' }] },
              git_branch: { buckets: [{ key: 'main' }] },
              git_commit_sha: { buckets: [{ key: 'def456' }] },
              total_repetitions: { value: 2 },
              build_url: { buckets: [] },
            },
          ],
        },
      },
    } as any);

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: EVALS_RUNS_URL,
      query: { page: 1, per_page: 25 },
    });

    const response = await handler(context, request, kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload.total).toBe(1);
    expect(response.payload.runs).toHaveLength(1);
    expect(response.payload.runs[0].run_id).toBe('run-abc');
    expect(response.payload.runs[0].task_model.id).toBe('gpt-4');
  });

  it('returns 500 when esClient.search throws', async () => {
    const { handler, context, esClient, logger } = setup();
    esClient.search.mockRejectedValueOnce(new Error('ES connection failed'));

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: EVALS_RUNS_URL,
      query: { page: 1, per_page: 25 },
    });

    const response = await handler(context, request, kibanaResponseFactory);

    expect(response.status).toBe(500);
    expect(response.payload).toEqual({
      message: 'Failed to list evaluation runs',
    });
    expect(logger.error).toHaveBeenCalled();
  });
});
