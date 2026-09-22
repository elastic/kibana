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
  EVALS_EXPERIMENT_DATASET_EXAMPLES_URL,
  API_VERSIONS,
  EXPERIMENT_EXAMPLE_PREVIEW_MAX_LENGTH,
  SCORES_SORT_ORDER,
  buildSpaceFilter,
} from '@kbn/evals-common';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { createEvaluatorRegistryMock } from '../../evaluators/registry.mock';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { registerGetExperimentDatasetExamplesRoute } from './get_experiment_dataset_examples';

describe('GET /internal/evals/experiments/{experimentId}/datasets/{datasetId}/examples', () => {
  const setup = () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    registerGetExperimentDatasetExamplesRoute({
      router,
      logger,
      canEncrypt: false,
      evaluatorRegistry: createEvaluatorRegistryMock(),
      getInferenceStart: async () => ({ getClient: jest.fn() } as unknown as InferenceServerStart),
      getEncryptedSavedObjectsStart: async () => encryptedSavedObjectsMock.createStart(),
      getInternalRemoteConfigsSoClient: async () => savedObjectsClientMock.create(),
    });

    const versionedRouter = router.versioned as MockedVersionedRouter;
    const { handler } = versionedRouter.getRoute('get', EVALS_EXPERIMENT_DATASET_EXAMPLES_URL)
      .versions[API_VERSIONS.internal.v1];

    const evaluationScoreService = {
      search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
    };
    const context = coreMock.createCustomRequestHandlerContext({
      evals: {
        evaluationScoreService,
      } as any,
    });

    return { handler, context, evaluationScoreService, logger };
  };

  const makeRequest = (
    experimentId = 'experiment-123',
    datasetId = 'dataset-123',
    query: { execution_id?: string; include_previews?: boolean } = {}
  ) =>
    httpServerMock.createKibanaRequest({
      method: 'get',
      path: EVALS_EXPERIMENT_DATASET_EXAMPLES_URL.replace('{experimentId}', experimentId).replace(
        '{datasetId}',
        datasetId
      ),
      params: { experimentId, datasetId },
      query,
    });

  const makeScore = (exampleId: string, exampleIndex: number, evaluatorName: string) => ({
    '@timestamp': '2026-09-22T10:00:00.000Z',
    experiment_id: 'experiment-123',
    example: {
      id: exampleId,
      index: exampleIndex,
      metadata: { source: 'retained-example-metadata' },
      dataset: { id: 'dataset-123', name: 'Dataset' },
    },
    task: {
      repetition_index: 0,
      trace_id: `task-trace-${exampleId}`,
      model: { id: 'task-model' },
    },
    evaluator: {
      name: evaluatorName,
      score: 0.75,
      explanation: 'retained evaluator explanation',
      metadata: { source: 'retained-evaluator-metadata' },
    },
    metadata: { execution_id: 'execution-123' },
  });

  it('uses one unpaginated score search that excludes only complete input and output', async () => {
    const { handler, context, evaluationScoreService } = setup();

    await handler(context, makeRequest(), kibanaResponseFactory);

    expect(evaluationScoreService.search).toHaveBeenCalledTimes(1);
    expect(evaluationScoreService.search).toHaveBeenCalledWith({
      query: {
        bool: {
          must: [
            { term: { 'example.dataset.id': 'dataset-123' } },
            { term: { experiment_id: 'experiment-123' } },
            buildSpaceFilter('default'),
          ],
        },
      },
      sort: SCORES_SORT_ORDER,
      size: 10000,
      _source_excludes: ['example.input', 'task.output'],
    });
  });

  it('groups full score documents by example index while retaining eager evaluator details', async () => {
    const { handler, context, evaluationScoreService } = setup();
    const exampleBScore1 = makeScore('example-b', 2, 'eval-1');
    const exampleAScore = makeScore('example-a', 1, 'eval-1');
    const exampleBScore2 = makeScore('example-b', 2, 'eval-2');
    evaluationScoreService.search.mockResolvedValueOnce({
      hits: {
        hits: [
          { _source: exampleBScore1 },
          { _source: exampleAScore },
          { _source: exampleBScore2 },
          { _source: { evaluator: { name: 'no-example' } } },
          { _source: undefined },
        ],
      },
    } as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      examples: [
        {
          example_id: 'example-a',
          example_index: 1,
          scores: [exampleAScore],
        },
        {
          example_id: 'example-b',
          example_index: 2,
          scores: [exampleBScore1, exampleBScore2],
        },
      ],
    });
    expect(response.payload.examples[0].scores[0]).toEqual(
      expect.objectContaining({
        example: expect.objectContaining({
          metadata: { source: 'retained-example-metadata' },
        }),
        evaluator: expect.objectContaining({
          explanation: 'retained evaluator explanation',
          metadata: { source: 'retained-evaluator-metadata' },
        }),
      })
    );
    expect(response.payload.examples[0].scores[0].example).not.toHaveProperty('input');
    expect(response.payload.examples[0].scores[0].task).not.toHaveProperty('output');
    expect(response.payload).not.toHaveProperty('page');
    expect(response.payload).not.toHaveProperty('per_page');
    expect(response.payload).not.toHaveProperty('total');
  });

  it('filters the bulk read by execution without requesting previews by default', async () => {
    const { handler, context, evaluationScoreService } = setup();

    await handler(
      context,
      makeRequest('experiment-123', 'dataset-123', { execution_id: 'execution-123' }),
      kibanaResponseFactory
    );

    expect(evaluationScoreService.search).toHaveBeenCalledTimes(1);
    expect(evaluationScoreService.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            must: [
              { term: { 'example.dataset.id': 'dataset-123' } },
              { term: { 'metadata.execution_id': 'execution-123' } },
              buildSpaceFilter('default'),
            ],
          },
        },
      })
    );
  });

  it('adds independently bounded previews from one collapsed source-filtered read', async () => {
    const { handler, context, evaluationScoreService } = setup();
    const largeInput = { value: `input-${'a'.repeat(5000)}-full-input-sentinel` };
    const largeOutput = { value: `output-${'b'.repeat(5000)}-full-output-sentinel` };
    evaluationScoreService.search.mockResolvedValueOnce({
      hits: {
        hits: [
          { _source: makeScore('example-b', 2, 'eval-1') },
          { _source: makeScore('example-a', 1, 'eval-1') },
          { _source: makeScore('example-c', 3, 'eval-1') },
        ],
      },
    } as any);
    evaluationScoreService.search.mockResolvedValueOnce({
      hits: {
        hits: [
          {
            _source: {
              example: { id: 'example-a', input: largeInput },
              task: { repetition_index: 0, output: largeOutput },
            },
          },
          {
            _source: {
              example: { id: 'example-b' },
              task: { repetition_index: 1, output: null },
            },
          },
          {
            _source: {
              example: { id: 'example-c', input: 'c'.repeat(2046) },
              task: { repetition_index: 2, output: { short: 'value' } },
            },
          },
        ],
      },
    } as any);

    const response = await handler(
      context,
      makeRequest('experiment-123', 'dataset-123', { include_previews: true }),
      kibanaResponseFactory
    );

    expect(evaluationScoreService.search).toHaveBeenCalledTimes(2);
    expect(evaluationScoreService.search).toHaveBeenNthCalledWith(2, {
      query: {
        bool: {
          must: [
            { term: { 'example.dataset.id': 'dataset-123' } },
            { term: { experiment_id: 'experiment-123' } },
            buildSpaceFilter('default'),
            { terms: { 'example.id': ['example-a', 'example-b', 'example-c'] } },
          ],
        },
      },
      size: 3,
      _source_includes: ['example.id', 'example.input', 'task.repetition_index', 'task.output'],
      collapse: { field: 'example.id' },
      sort: [
        { 'task.repetition_index': { order: 'asc', missing: '_last' } },
        { _shard_doc: { order: 'asc' } },
      ],
      track_total_hits: false,
    });
    expect(response.payload.examples[0].preview).toEqual({
      repetition_index: 0,
      input: { content: expect.any(String), truncated: true },
      output: { content: expect.any(String), truncated: true },
    });
    expect(response.payload.examples[0].preview.input.content).toHaveLength(
      EXPERIMENT_EXAMPLE_PREVIEW_MAX_LENGTH
    );
    expect(response.payload.examples[0].preview.output.content).toHaveLength(
      EXPERIMENT_EXAMPLE_PREVIEW_MAX_LENGTH
    );
    expect(response.payload.examples[1].preview).toEqual({
      repetition_index: 1,
      input: null,
      output: null,
    });
    expect(response.payload.examples[2].preview).toEqual({
      repetition_index: 2,
      input: {
        content: expect.any(String),
        truncated: false,
      },
      output: {
        content: '{\n  "short": "value"\n}',
        truncated: false,
      },
    });
    expect(response.payload.examples[2].preview.input.content).toHaveLength(
      EXPERIMENT_EXAMPLE_PREVIEW_MAX_LENGTH
    );
    expect(JSON.stringify(response.payload)).not.toContain('full-input-sentinel');
    expect(JSON.stringify(response.payload)).not.toContain('full-output-sentinel');
  });

  it('returns 500 when ES throws', async () => {
    const { handler, context, evaluationScoreService, logger } = setup();
    evaluationScoreService.search.mockRejectedValueOnce(new Error('ES error'));

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(500);
    expect(response.payload).toEqual({
      message: 'Failed to get experiment dataset examples',
    });
    expect(logger.error).toHaveBeenCalled();
  });

  it('returns an actionable 400 and logs at warn when the ES response is too large', async () => {
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
    expect(logger.warn).toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });
});
