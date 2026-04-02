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
import {
  EVALS_RUN_SCORES_URL,
  API_VERSIONS,
  EVALUATIONS_INDEX_PATTERN,
  SCORES_SORT_ORDER,
} from '@kbn/evals-common';
import { registerGetRunScoresRoute } from './get_run_scores';

describe('GET /internal/evals/runs/{runId}/scores', () => {
  const setup = () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    registerGetRunScoresRoute({ router, logger });

    const versionedRouter = router.versioned as MockedVersionedRouter;
    const { handler } = versionedRouter.getRoute('get', EVALS_RUN_SCORES_URL).versions[
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
      path: EVALS_RUN_SCORES_URL.replace('{runId}', runId),
      params: { runId },
      query: {},
    });

  it('uses the correct index, sort order, and size', async () => {
    const { handler, context, esClient } = setup();
    esClient.search.mockResolvedValueOnce({ hits: { hits: [] } } as any);

    await handler(context, makeRequest(), kibanaResponseFactory);

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: EVALUATIONS_INDEX_PATTERN,
        sort: SCORES_SORT_ORDER,
        size: 10000,
      })
    );
  });

  it('returns scores and total count on success', async () => {
    const { handler, context, esClient } = setup();
    const scoreDoc = { run_id: 'run-abc', evaluator: { name: 'correctness', score: 0.9 } };
    esClient.search.mockResolvedValueOnce({
      hits: { hits: [{ _source: scoreDoc }, { _source: scoreDoc }] },
    } as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload.scores).toHaveLength(2);
    expect(response.payload.total).toBe(2);
  });

  it('filters out hits with no _source', async () => {
    const { handler, context, esClient } = setup();
    esClient.search.mockResolvedValueOnce({
      hits: {
        hits: [{ _source: { run_id: 'run-abc' } }, { _source: undefined }],
      },
    } as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload.scores).toHaveLength(1);
    expect(response.payload.total).toBe(1);
  });

  it('returns 500 when ES throws', async () => {
    const { handler, context, esClient, logger } = setup();
    esClient.search.mockRejectedValueOnce(new Error('ES error'));

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(500);
    expect(logger.error).toHaveBeenCalled();
  });
});
