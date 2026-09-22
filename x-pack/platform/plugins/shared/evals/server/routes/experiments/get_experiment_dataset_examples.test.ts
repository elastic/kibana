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
  EXPERIMENT_EXAMPLE_PAGE_SORT,
  EXPERIMENT_EXAMPLE_SUMMARY_FIELDS,
  EXPERIMENT_EXAMPLE_SUMMARY_SORT,
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
    query: { page: number; execution_id?: string; include_previews?: boolean } = { page: 1 }
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

  const makeExampleHit = (exampleId: string, exampleIndex: number) => ({
    fields: {
      'example.id': [exampleId],
      'example.index': [exampleIndex],
    },
  });

  const makeScoreHit = (
    exampleId: string,
    exampleIndex: number,
    evaluatorName: string,
    scoreId: string
  ) => ({
    fields: {
      '@timestamp': ['2026-09-22T10:00:00.000Z'],
      'example.id': [exampleId],
      'example.index': [exampleIndex],
      'example.input': [{ sentinel: 'large-input' }],
      'example.metadata': [{ sentinel: 'large-example-metadata' }],
      'task.repetition_index': [0],
      'task.trace_id': [`task-trace-${exampleId}`],
      'task.output': [{ sentinel: 'large-output' }],
      'evaluator.name': [evaluatorName],
      'evaluator.score': [0.75],
      'evaluator.label': ['pass'],
      'evaluator.trace_id': [`evaluator-trace-${exampleId}`],
      'evaluator.explanation': ['large-explanation'],
      'evaluator.metadata': [{ sentinel: 'large-evaluator-metadata' }],
      'evaluator.model.id': ['judge-model'],
      'evaluator.model.family': ['judge-family'],
      'evaluator.model.provider': ['judge-provider'],
    },
    sort: [exampleIndex, exampleId, evaluatorName, 0, scoreId],
  });

  it('uses a fixed 25-example page offset and compact source-free score searches', async () => {
    const { handler, context, evaluationScoreService } = setup();
    evaluationScoreService.search.mockResolvedValueOnce({
      hits: { hits: [makeExampleHit('example-26', 26)] },
      aggregations: { total_examples: { value: 26 } },
    } as any);
    evaluationScoreService.search.mockResolvedValueOnce({ hits: { hits: [] } } as any);

    await handler(
      context,
      makeRequest('experiment-123', 'dataset-123', { page: 2 }),
      kibanaResponseFactory
    );

    expect(evaluationScoreService.search).toHaveBeenNthCalledWith(1, {
      from: 25,
      size: 25,
      _source: false,
      fields: ['example.id', 'example.index'],
      collapse: { field: 'example.id' },
      sort: EXPERIMENT_EXAMPLE_PAGE_SORT,
      aggs: {
        total_examples: {
          cardinality: { field: 'example.id', precision_threshold: 10000 },
        },
      },
      track_total_hits: false,
      query: {
        bool: {
          must: [
            { term: { 'example.dataset.id': 'dataset-123' } },
            { term: { experiment_id: 'experiment-123' } },
            buildSpaceFilter('default'),
          ],
        },
      },
    });
    expect(evaluationScoreService.search).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        size: 10000,
        _source: false,
        fields: EXPERIMENT_EXAMPLE_SUMMARY_FIELDS,
        sort: EXPERIMENT_EXAMPLE_SUMMARY_SORT,
        query: {
          bool: {
            must: [
              { term: { 'example.dataset.id': 'dataset-123' } },
              { term: { experiment_id: 'experiment-123' } },
              buildSpaceFilter('default'),
              { terms: { 'example.id': ['example-26'] } },
            ],
          },
        },
      })
    );
    expect(evaluationScoreService.search).toHaveBeenCalledTimes(2);
  });

  it('groups compact scores by the ordered page examples without returning large fields', async () => {
    const { handler, context, evaluationScoreService } = setup();
    evaluationScoreService.search.mockResolvedValueOnce({
      hits: {
        hits: [
          makeExampleHit('example-a', 1),
          makeExampleHit('example-b', 2),
          { fields: { 'example.index': [3] } },
        ],
      },
      aggregations: { total_examples: { value: 2 } },
    } as any);
    evaluationScoreService.search.mockResolvedValueOnce({
      hits: {
        hits: [
          makeScoreHit('example-a', 1, 'eval-1', 'score-a'),
          makeScoreHit('example-b', 2, 'eval-1', 'score-b1'),
          makeScoreHit('example-b', 2, 'eval-2', 'score-b2'),
          { fields: { 'example.id': ['example-b'] } },
        ],
      },
    } as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload.examples).toEqual([
      {
        example_id: 'example-a',
        example_index: 1,
        scores: [
          {
            '@timestamp': '2026-09-22T10:00:00.000Z',
            task: { repetition_index: 0, trace_id: 'task-trace-example-a' },
            evaluator: {
              name: 'eval-1',
              score: 0.75,
              label: 'pass',
              trace_id: 'evaluator-trace-example-a',
              model: {
                id: 'judge-model',
                family: 'judge-family',
                provider: 'judge-provider',
              },
            },
          },
        ],
      },
      {
        example_id: 'example-b',
        example_index: 2,
        scores: [
          expect.objectContaining({ evaluator: expect.objectContaining({ name: 'eval-1' }) }),
          expect.objectContaining({ evaluator: expect.objectContaining({ name: 'eval-2' }) }),
        ],
      },
    ]);
    expect(response.payload).toEqual(expect.objectContaining({ page: 1, per_page: 25, total: 2 }));
    expect(JSON.stringify(response.payload)).not.toContain('large-');
  });

  it('adds bounded previews from one collapsed, source-filtered read when requested', async () => {
    const { handler, context, evaluationScoreService } = setup();
    const largeInput = { value: `input-${'a'.repeat(5000)}-full-input-sentinel` };
    const largeOutput = { value: `output-${'b'.repeat(5000)}-full-output-sentinel` };
    evaluationScoreService.search.mockResolvedValueOnce({
      hits: { hits: [makeExampleHit('example-a', 1), makeExampleHit('example-b', 2)] },
      aggregations: { total_examples: { value: 2 } },
    } as any);
    evaluationScoreService.search.mockResolvedValueOnce({ hits: { hits: [] } } as any);
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
              example: { id: 'example-b', input: { short: 'value' } },
              task: { repetition_index: 1, output: null },
            },
          },
        ],
      },
    } as any);

    const response = await handler(
      context,
      makeRequest('experiment-123', 'dataset-123', { page: 1, include_previews: true }),
      kibanaResponseFactory
    );

    expect(evaluationScoreService.search).toHaveBeenCalledTimes(3);
    expect(evaluationScoreService.search).toHaveBeenNthCalledWith(3, {
      query: {
        bool: {
          must: [
            { term: { 'example.dataset.id': 'dataset-123' } },
            { term: { experiment_id: 'experiment-123' } },
            buildSpaceFilter('default'),
            { terms: { 'example.id': ['example-a', 'example-b'] } },
          ],
        },
      },
      size: 25,
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
      input: { content: '{\n  "short": "value"\n}', truncated: false },
      output: null,
    });
    expect(JSON.stringify(response.payload)).not.toContain('full-input-sentinel');
    expect(JSON.stringify(response.payload)).not.toContain('full-output-sentinel');
    expect(JSON.stringify(response.payload)).not.toContain('evaluator.metadata');
  });

  it('combines search-after batches so page 2 is complete beyond 10,000 scores', async () => {
    const { handler, context, evaluationScoreService } = setup();
    evaluationScoreService.search.mockResolvedValueOnce({
      hits: { hits: [makeExampleHit('example-26', 26)] },
      aggregations: { total_examples: { value: 26 } },
    } as any);
    evaluationScoreService.search.mockResolvedValueOnce({
      hits: {
        hits: Array.from({ length: 10000 }, (_, index) =>
          makeScoreHit('example-26', 26, 'quality', `score-${index}`)
        ),
      },
    } as any);
    evaluationScoreService.search.mockResolvedValueOnce({
      hits: { hits: [makeScoreHit('example-26', 26, 'quality', 'score-10000')] },
    } as any);

    const response = await handler(
      context,
      makeRequest('experiment-123', 'dataset-123', { page: 2 }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload).toEqual(
      expect.objectContaining({
        page: 2,
        per_page: 25,
        total: 26,
        examples: [
          expect.objectContaining({
            example_id: 'example-26',
            scores: expect.any(Array),
          }),
        ],
      })
    );
    expect(response.payload.examples[0].scores).toHaveLength(10001);
    expect(evaluationScoreService.search).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        search_after: [26, 'example-26', 'quality', 0, 'score-9999'],
      })
    );
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
