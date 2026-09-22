/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { MockedVersionedRouter } from '@kbn/core-http-router-server-mocks';
import {
  API_VERSIONS,
  EVALS_EXPERIMENT_EXAMPLE_DETAILS_URL,
  buildSpaceFilter,
} from '@kbn/evals-common';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { EVALS_API_PRIVILEGES } from '../../../common';
import { createEvaluatorRegistryMock } from '../../evaluators/registry.mock';
import { registerGetExperimentExampleDetailsRoute } from './get_experiment_example_details';

describe('GET experiment example repetition details', () => {
  const setup = () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    const getSpaceId = jest.fn().mockResolvedValue('space-a');
    registerGetExperimentExampleDetailsRoute({
      router,
      logger,
      canEncrypt: false,
      evaluatorRegistry: createEvaluatorRegistryMock(),
      getInferenceStart: async () => ({ getClient: jest.fn() } as unknown as InferenceServerStart),
      getEncryptedSavedObjectsStart: async () => encryptedSavedObjectsMock.createStart(),
      getInternalRemoteConfigsSoClient: async () => savedObjectsClientMock.create(),
      getSpaceId,
    });

    const versionedRouter = router.versioned as MockedVersionedRouter;
    const route = versionedRouter.getRoute('get', EVALS_EXPERIMENT_EXAMPLE_DETAILS_URL);
    const routeConfig = versionedRouter.get.mock.calls[0][0];
    const { handler } = route.versions[API_VERSIONS.internal.v1];
    const evaluationScoreService = {
      search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
    };
    const context = coreMock.createCustomRequestHandlerContext({
      evals: {
        evaluationScoreService,
      } as any,
    });

    return { routeConfig, handler, context, evaluationScoreService, logger, getSpaceId };
  };

  const makeRequest = (query: { execution_id?: string } = {}) =>
    httpServerMock.createKibanaRequest({
      method: 'get',
      path: EVALS_EXPERIMENT_EXAMPLE_DETAILS_URL.replace('{experimentId}', 'experiment-123')
        .replace('{datasetId}', 'dataset-123')
        .replace('{exampleId}', 'example-123')
        .replace('{repetitionIndex}', '2'),
      params: {
        experimentId: 'experiment-123',
        datasetId: 'dataset-123',
        exampleId: 'example-123',
        repetitionIndex: 2,
      },
      query,
    });

  const sharedSource = {
    example: {
      id: 'example-123',
      index: 7,
      input: { prompt: 'large-input' },
      metadata: { source: 'large-example-metadata' },
    },
    task: {
      repetition_index: 2,
      output: { answer: 'large-output' },
      model: { id: 'task-model', family: 'task-family', provider: 'task-provider' },
      trace_id: 'task-trace',
    },
  };

  it('registers the existing evals read privilege', () => {
    const { routeConfig } = setup();

    expect(routeConfig.security).toEqual({
      authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.read] },
    });
  });

  it('filters by experiment, dataset, example, repetition, and space', async () => {
    const { handler, context, evaluationScoreService, getSpaceId } = setup();
    evaluationScoreService.search
      .mockResolvedValueOnce({ hits: { hits: [{ _source: sharedSource }] } } as any)
      .mockResolvedValueOnce({ hits: { hits: [] } } as any);

    await handler(context, makeRequest(), kibanaResponseFactory);

    const expectedQuery = {
      bool: {
        must: [
          { term: { 'example.dataset.id': 'dataset-123' } },
          { term: { experiment_id: 'experiment-123' } },
          buildSpaceFilter('space-a'),
          { term: { 'example.id': 'example-123' } },
          { term: { 'task.repetition_index': 2 } },
        ],
      },
    };
    expect(evaluationScoreService.search).toHaveBeenNthCalledWith(1, {
      query: expectedQuery,
      size: 1,
      _source_includes: [
        'example.id',
        'example.index',
        'example.input',
        'example.metadata',
        'task.repetition_index',
        'task.output',
        'task.model',
        'task.trace_id',
      ],
      track_total_hits: false,
    });
    expect(evaluationScoreService.search).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        query: expectedQuery,
        size: 10000,
        _source_includes: ['evaluator'],
      })
    );
    expect(getSpaceId).toHaveBeenCalledTimes(1);
  });

  it('returns shared payload once and full evaluator details separately', async () => {
    const { handler, context, evaluationScoreService } = setup();
    evaluationScoreService.search
      .mockResolvedValueOnce({ hits: { hits: [{ _source: sharedSource }] } } as any)
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                example: sharedSource.example,
                task: sharedSource.task,
                evaluator: {
                  name: 'correctness',
                  version: '1.2.3',
                  score: 0.9,
                  label: 'pass',
                  explanation: 'Detailed explanation',
                  metadata: { rubric: 'full evaluator metadata' },
                  trace_id: 'evaluator-trace',
                  direction: 'maximize',
                  kind: 'llm',
                  model: { id: 'judge-model', provider: 'judge-provider' },
                },
              },
            },
            {
              _source: {
                evaluator: {
                  name: 'latency',
                  score: 42,
                  metadata: { unit: 'ms' },
                  direction: 'minimize',
                  kind: 'code',
                },
              },
            },
          ],
        },
      } as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      example: sharedSource.example,
      task: sharedSource.task,
      evaluators: [
        {
          name: 'correctness',
          version: '1.2.3',
          score: 0.9,
          label: 'pass',
          explanation: 'Detailed explanation',
          metadata: { rubric: 'full evaluator metadata' },
          trace_id: 'evaluator-trace',
          direction: 'maximize',
          kind: 'llm',
          model: { id: 'judge-model', provider: 'judge-provider' },
        },
        {
          name: 'latency',
          score: 42,
          metadata: { unit: 'ms' },
          direction: 'minimize',
          kind: 'code',
        },
      ],
    });
    expect(JSON.stringify(response.payload).match(/large-output/g)).toHaveLength(1);
  });

  it('normalizes payload fields absent from legacy documents to null', async () => {
    const { handler, context, evaluationScoreService } = setup();
    evaluationScoreService.search
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                example: { id: 'example-123' },
                task: { model: { id: 'task-model' } },
              },
            },
          ],
        },
      } as any)
      .mockResolvedValueOnce({ hits: { hits: [] } } as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      example: { id: 'example-123', index: null, input: null, metadata: null },
      task: {
        repetition_index: 2,
        output: null,
        model: { id: 'task-model' },
        trace_id: null,
      },
      evaluators: [],
    });
  });

  it('returns 404 without querying evaluators when the repetition is absent', async () => {
    const { handler, context, evaluationScoreService } = setup();
    evaluationScoreService.search.mockResolvedValueOnce({ hits: { hits: [] } } as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(404);
    expect(response.payload).toEqual({
      message: 'Example repetition not found: example-123/2',
    });
    expect(evaluationScoreService.search).toHaveBeenCalledTimes(1);
  });

  it('filters by execution ID instead of experiment ID when requested', async () => {
    const { handler, context, evaluationScoreService } = setup();
    evaluationScoreService.search
      .mockResolvedValueOnce({ hits: { hits: [{ _source: sharedSource }] } } as any)
      .mockResolvedValueOnce({ hits: { hits: [] } } as any);

    await handler(context, makeRequest({ execution_id: 'execution-456' }), kibanaResponseFactory);

    const firstQuery = evaluationScoreService.search.mock.calls[0][0].query;
    expect(firstQuery.bool.must).toContainEqual({
      term: { 'metadata.execution_id': 'execution-456' },
    });
    expect(firstQuery.bool.must).not.toContainEqual({
      term: { experiment_id: 'experiment-123' },
    });
  });

  it('returns an actionable 400 when an evaluator detail response is too large', async () => {
    const { handler, context, evaluationScoreService, logger } = setup();
    evaluationScoreService.search
      .mockResolvedValueOnce({ hits: { hits: [{ _source: sharedSource }] } } as any)
      .mockRejectedValueOnce(
        new errors.RequestAbortedError(
          'The content length (9000) is bigger than the maximum allowed buffer (42)'
        )
      );

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(400);
    expect(response.payload).toEqual({
      message:
        'The response is too large to process. error: The content length (9000) is bigger than the maximum allowed buffer (42)',
    });
    expect(logger.warn).toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });
});
