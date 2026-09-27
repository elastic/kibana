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
import { EXAMPLE_REPETITION_PAYLOAD_SORT } from './preview_source_script';

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

  const detailsSource = {
    example: {
      input: { prompt: 'large-input' },
    },
    task: {
      output: { answer: 'large-output' },
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
    evaluationScoreService.search.mockResolvedValueOnce({
      hits: { hits: [{ _source: detailsSource }] },
    } as any);

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
    expect(evaluationScoreService.search).toHaveBeenCalledWith({
      query: expectedQuery,
      size: 1,
      sort: EXAMPLE_REPETITION_PAYLOAD_SORT,
      _source_includes: ['example.input', 'task.output'],
      track_total_hits: false,
    });
    expect(evaluationScoreService.search).toHaveBeenCalledTimes(1);
    expect(getSpaceId).toHaveBeenCalledTimes(1);
  });

  it('returns only the input and output from one Elasticsearch read', async () => {
    const { handler, context, evaluationScoreService } = setup();
    evaluationScoreService.search.mockResolvedValueOnce({
      hits: { hits: [{ _source: detailsSource }] },
    } as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      example: { input: { prompt: 'large-input' } },
      task: { output: { answer: 'large-output' } },
    });
    expect(evaluationScoreService.search).toHaveBeenCalledTimes(1);
  });

  it('normalizes payload fields absent from legacy documents to null', async () => {
    const { handler, context, evaluationScoreService } = setup();
    evaluationScoreService.search.mockResolvedValueOnce({
      hits: { hits: [{ _source: {} }] },
    } as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      example: { input: null },
      task: { output: null },
    });
    expect(evaluationScoreService.search).toHaveBeenCalledTimes(1);
  });

  it('returns 404 when the repetition is absent', async () => {
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
    evaluationScoreService.search.mockResolvedValueOnce({
      hits: { hits: [{ _source: detailsSource }] },
    } as any);

    await handler(context, makeRequest({ execution_id: 'execution-456' }), kibanaResponseFactory);

    const firstQuery = evaluationScoreService.search.mock.calls[0][0].query;
    expect(firstQuery.bool.must).toContainEqual({
      term: { 'metadata.execution_id': 'execution-456' },
    });
    expect(firstQuery.bool.must).not.toContainEqual({
      term: { experiment_id: 'experiment-123' },
    });
  });

  it('returns an actionable 400 when the detail response is too large', async () => {
    const { handler, context, evaluationScoreService, logger } = setup();
    evaluationScoreService.search.mockRejectedValueOnce(
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
    expect(evaluationScoreService.search).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });
});
