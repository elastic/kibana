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
import { registerPairwiseRoute } from './pairwise';

const EVALS_PAIRWISE_URL = `${EVALS_INTERNAL_URL}/experiments/pairwise`;

const createMockEvaluator = (name: string): ServerEvaluator => ({
  name,
  kind: 'CODE',
  description: 'test evaluator',
  source: 'prebuilt',
  evaluate: jest.fn().mockResolvedValue({
    evaluator: name,
    kind: 'CODE',
    score: 0.8,
    label: 'pass',
  }),
});

describe('POST /internal/evals/experiments/pairwise', () => {
  const setup = () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    const evaluatorRegistry = new EvaluatorRegistry(logger);

    registerPairwiseRoute({ router, logger, evaluatorRegistry });

    const versionedRouter = router.versioned as MockedVersionedRouter;
    const { handler } = versionedRouter.getRoute('post', EVALS_PAIRWISE_URL).versions[
      API_VERSIONS.internal.v1
    ];

    const datasetClient = {
      get: jest.fn(),
      list: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      addExamples: jest.fn(),
      updateExample: jest.fn(),
      deleteExample: jest.fn(),
      upsert: jest.fn(),
    };

    const datasetService = {
      getClient: jest.fn().mockReturnValue(datasetClient),
    };

    const mockCoreContext = coreMock.createRequestHandlerContext();
    const context = coreMock.createCustomRequestHandlerContext({
      core: mockCoreContext,
      evals: { datasetService } as any,
    });

    return { handler, context, logger, evaluatorRegistry, datasetClient };
  };

  it('runs pairwise experiment with inline skills and returns results', async () => {
    const { handler, context, evaluatorRegistry, datasetClient } = setup();

    evaluatorRegistry.register(createMockEvaluator('test-eval'));

    datasetClient.get.mockResolvedValue({
      name: 'test-dataset',
      description: 'test',
      examples: [
        { id: 'ex-1', input: { query: 'hello' }, output: { answer: 'world' } },
        { id: 'ex-2', input: { query: 'foo' }, output: { answer: 'bar' } },
      ],
    });

    const request = httpServerMock.createKibanaRequest({
      method: 'post',
      path: EVALS_PAIRWISE_URL,
      body: {
        skill_a: { name: 'Skill A', description: 'desc A', markdown: '# A' },
        skill_b: { name: 'Skill B', description: 'desc B', markdown: '# B' },
        dataset_id: 'dataset-1',
        evaluators: ['test-eval'],
        connector_id: 'conn-1',
        repetitions: 1,
      },
    });

    const response = await handler(context, request, kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload.skill_a_id).toBe('inline-a');
    expect(response.payload.skill_b_id).toBe('inline-b');
    expect(response.payload.per_evaluator).toHaveLength(1);
    expect(response.payload.per_evaluator[0].evaluator).toBe('test-eval');
    // Verify snake_case transform (not camelCase)
    expect(response.payload.per_evaluator[0].score_a).toEqual(expect.any(Number));
    expect(response.payload.per_evaluator[0].score_b).toEqual(expect.any(Number));
    expect(response.payload.per_evaluator[0].scoreA).toBeUndefined();
    expect(response.payload.per_evaluator[0].scoreB).toBeUndefined();
    expect(response.payload.aggregate_winner).toBeDefined();
    expect(response.payload.significance).toBeDefined();
    expect(response.payload.details.total_examples).toBe(2);
    expect(response.payload.timestamp).toBeDefined();
  });

  it('runs pairwise experiment with skill IDs and inline content', async () => {
    const { handler, context, evaluatorRegistry, datasetClient } = setup();

    evaluatorRegistry.register(createMockEvaluator('test-eval'));

    datasetClient.get.mockResolvedValue({
      name: 'test-dataset',
      description: 'test',
      examples: [{ id: 'ex-1', input: { query: 'hello' }, output: { answer: 'world' } }],
    });

    const request = httpServerMock.createKibanaRequest({
      method: 'post',
      path: EVALS_PAIRWISE_URL,
      body: {
        skill_a_id: 'skill-123',
        skill_a: { name: 'Skill A', description: 'desc A', markdown: '# A' },
        skill_b_id: 'skill-456',
        skill_b: { name: 'Skill B', description: 'desc B', markdown: '# B' },
        dataset_id: 'dataset-1',
        evaluators: ['test-eval'],
        connector_id: 'conn-1',
        repetitions: 1,
      },
    });

    const response = await handler(context, request, kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload.skill_a_id).toBe('skill-123');
    expect(response.payload.skill_b_id).toBe('skill-456');
  });

  it('returns 400 when evaluator is not found', async () => {
    const { handler, context, datasetClient } = setup();

    datasetClient.get.mockResolvedValue({
      name: 'test-dataset',
      description: 'test',
      examples: [],
    });

    const request = httpServerMock.createKibanaRequest({
      method: 'post',
      path: EVALS_PAIRWISE_URL,
      body: {
        skill_a: { name: 'A', description: 'a', markdown: '# A' },
        skill_b: { name: 'B', description: 'b', markdown: '# B' },
        dataset_id: 'dataset-1',
        evaluators: ['nonexistent'],
        connector_id: 'conn-1',
        repetitions: 1,
      },
    });

    const response = await handler(context, request, kibanaResponseFactory);

    expect(response.status).toBe(400);
    expect(response.payload).toEqual({
      message: 'Evaluator not found: nonexistent',
    });
  });

  it('returns 404 when dataset is not found', async () => {
    const { handler, context, evaluatorRegistry, datasetClient } = setup();

    evaluatorRegistry.register(createMockEvaluator('test-eval'));
    datasetClient.get.mockResolvedValue(undefined);

    const request = httpServerMock.createKibanaRequest({
      method: 'post',
      path: EVALS_PAIRWISE_URL,
      body: {
        skill_a: { name: 'A', description: 'a', markdown: '# A' },
        skill_b: { name: 'B', description: 'b', markdown: '# B' },
        dataset_id: 'missing-dataset',
        evaluators: ['test-eval'],
        connector_id: 'conn-1',
        repetitions: 1,
      },
    });

    const response = await handler(context, request, kibanaResponseFactory);

    expect(response.status).toBe(404);
    expect(response.payload).toEqual({
      message: 'Dataset not found: missing-dataset',
    });
  });

  it('returns 500 on unexpected errors', async () => {
    const { handler, context, evaluatorRegistry, datasetClient } = setup();

    evaluatorRegistry.register(createMockEvaluator('test-eval'));
    datasetClient.get.mockRejectedValue(new Error('ES connection failed'));

    const request = httpServerMock.createKibanaRequest({
      method: 'post',
      path: EVALS_PAIRWISE_URL,
      body: {
        skill_a: { name: 'A', description: 'a', markdown: '# A' },
        skill_b: { name: 'B', description: 'b', markdown: '# B' },
        dataset_id: 'dataset-1',
        evaluators: ['test-eval'],
        connector_id: 'conn-1',
        repetitions: 1,
      },
    });

    const response = await handler(context, request, kibanaResponseFactory);

    expect(response.status).toBe(500);
  });
});
