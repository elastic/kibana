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
import { API_VERSIONS, EVALS_INTERNAL_URL } from '@kbn/evals-common';
import { EvaluatorRegistry } from '../../lib/evaluation_engine';
import type { ServerEvaluator } from '../../lib/evaluation_engine';
import { registerEvaluateRoute } from './evaluate';

const EVALS_EVALUATE_URL = `${EVALS_INTERNAL_URL}/evaluate`;

describe('POST /internal/evals/evaluate', () => {
  const setup = () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    const evaluatorRegistry = new EvaluatorRegistry(logger);

    registerEvaluateRoute({ router, logger, evaluatorRegistry });

    const versionedRouter = router.versioned as MockedVersionedRouter;
    const { handler } = versionedRouter.getRoute('post', EVALS_EVALUATE_URL).versions[
      API_VERSIONS.internal.v1
    ];

    const mockCoreContext = coreMock.createRequestHandlerContext();
    const context = coreMock.createCustomRequestHandlerContext({ core: mockCoreContext });

    return { handler, context, logger, evaluatorRegistry };
  };

  it('runs evaluators and returns results', async () => {
    const { handler, context, evaluatorRegistry } = setup();

    const mockEvaluator: ServerEvaluator = {
      name: 'test-eval',
      kind: 'CODE',
      description: 'test',
      source: 'prebuilt',
      evaluate: jest.fn().mockResolvedValue({
        evaluator: 'test-eval',
        kind: 'CODE',
        score: 1.0,
        label: 'pass',
      }),
    };
    evaluatorRegistry.register(mockEvaluator);

    const request = httpServerMock.createKibanaRequest({
      method: 'post',
      path: EVALS_EVALUATE_URL,
      body: {
        items: [{ input: { text: 'hello' }, output: 'world' }],
        evaluator_names: ['test-eval'],
        connector_id: 'conn-1',
      },
    });

    const response = await handler(context, request, kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload.runId).toBeDefined();
    expect(response.payload.results).toHaveLength(1);
    expect(response.payload.results[0].evaluatorResults[0].score).toBe(1.0);
  });

  it('returns 400 when evaluator is not found', async () => {
    const { handler, context } = setup();

    const request = httpServerMock.createKibanaRequest({
      method: 'post',
      path: EVALS_EVALUATE_URL,
      body: {
        items: [{ input: { text: 'hello' }, output: 'world' }],
        evaluator_names: ['nonexistent'],
        connector_id: 'conn-1',
      },
    });

    const response = await handler(context, request, kibanaResponseFactory);

    expect(response.status).toBe(400);
    expect(response.payload).toEqual({
      message: 'Evaluator not found: nonexistent',
    });
  });
});
