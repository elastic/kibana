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
import { registerListEvaluatorsRoute } from './list_evaluators';

const EVALS_EVALUATORS_URL = `${EVALS_INTERNAL_URL}/evaluators`;

describe('GET /internal/evals/evaluators', () => {
  const setup = () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    const evaluatorRegistry = new EvaluatorRegistry(logger);

    registerListEvaluatorsRoute({ router, logger, evaluatorRegistry });

    const versionedRouter = router.versioned as MockedVersionedRouter;
    const { handler } = versionedRouter.getRoute('get', EVALS_EVALUATORS_URL).versions[
      API_VERSIONS.internal.v1
    ];

    const mockCoreContext = coreMock.createRequestHandlerContext();
    const context = coreMock.createCustomRequestHandlerContext({ core: mockCoreContext });

    return { handler, context, evaluatorRegistry };
  };

  it('returns empty list when no evaluators are registered', async () => {
    const { handler, context } = setup();

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: EVALS_EVALUATORS_URL,
    });

    const response = await handler(context, request, kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ evaluators: [], total: 0 });
  });

  it('returns all registered evaluators', async () => {
    const { handler, context, evaluatorRegistry } = setup();

    const evaluators: ServerEvaluator[] = [
      {
        name: 'code-check',
        kind: 'CODE',
        description: 'Checks code output',
        source: 'prebuilt',
        evaluate: jest.fn(),
      },
      {
        name: 'llm-judge',
        kind: 'LLM',
        description: 'LLM-based judging',
        source: 'custom',
        evaluate: jest.fn(),
      },
    ];

    for (const e of evaluators) {
      evaluatorRegistry.register(e);
    }

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: EVALS_EVALUATORS_URL,
    });

    const response = await handler(context, request, kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload.evaluators).toHaveLength(2);
    expect(response.payload.evaluators[0]).toMatchObject({
      id: 'code-check',
      name: 'code-check',
      kind: 'CODE',
      description: 'Checks code output',
      source: 'prebuilt',
      type: 'prebuilt',
      usage_count: 0,
      version: 1,
    });
    expect(response.payload.evaluators[1]).toMatchObject({
      id: 'llm-judge',
      name: 'llm-judge',
      kind: 'LLM',
      description: 'LLM-based judging',
      source: 'custom',
    });
  });
});
