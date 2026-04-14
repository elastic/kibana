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
  EVALS_EXAMPLE_SCORES_URL,
  API_VERSIONS,
  EVALUATIONS_INDEX_PATTERN,
} from '@kbn/evals-common';
import { registerGetExampleScoresRoute } from './get_example_scores';

describe('GET /internal/evals/examples/{exampleId}/scores', () => {
  const setup = () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    registerGetExampleScoresRoute({ router, logger });

    const versionedRouter = router.versioned as MockedVersionedRouter;
    const { handler } = versionedRouter.getRoute('get', EVALS_EXAMPLE_SCORES_URL).versions[
      API_VERSIONS.internal.v1
    ];

    const mockCoreContext = coreMock.createRequestHandlerContext();
    const context = coreMock.createCustomRequestHandlerContext({ core: mockCoreContext });
    const esClient = mockCoreContext.elasticsearch.client.asCurrentUser;

    return { handler, context, esClient, logger };
  };

  const makeRequest = (exampleId = 'example-123') =>
    httpServerMock.createKibanaRequest({
      method: 'get',
      path: EVALS_EXAMPLE_SCORES_URL.replace('{exampleId}', exampleId),
      params: { exampleId },
      query: {},
    });

  it('uses the correct ES query parameters', async () => {
    const { handler, context, esClient } = setup();
    esClient.search.mockResolvedValueOnce({ hits: { hits: [] } } as any);

    await handler(context, makeRequest(), kibanaResponseFactory);

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: EVALUATIONS_INDEX_PATTERN,
        query: {
          bool: {
            must: [{ term: { 'example.id': 'example-123' } }],
          },
        },
        size: 10000,
      })
    );
  });

  it('returns scores sorted by timestamp desc and total count on success', async () => {
    const { handler, context, esClient } = setup();
    const scoreDoc = {
      example: { id: 'example-123' },
      evaluator: { name: 'correctness', score: 0.9 },
    };
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
        hits: [{ _source: { example: { id: 'example-123' } } }, { _source: undefined }],
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
    expect(response.payload).toEqual({
      message: 'Failed to get example scores',
    });
    expect(logger.error).toHaveBeenCalled();
  });
});
