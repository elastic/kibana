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
import { EXPERIMENT_LIMITS } from '../../../common';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { createEvaluatorRegistryMock } from '../../evaluators/registry.mock';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { registerGetExperimentDatasetExamplesRoute } from './get_experiment_dataset_examples';
import { EXAMPLE_REPETITION_PAYLOAD_SORT, previewScriptField } from './preview_source_script';

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

  it('copies scripted previews from one terms and top_hits aggregation', async () => {
    const { handler, context, evaluationScoreService } = setup();
    const truncatedInput = {
      content: 'i'.repeat(EXPERIMENT_EXAMPLE_PREVIEW_MAX_LENGTH),
      truncated: true,
    };
    const truncatedOutput = {
      content: 'o'.repeat(EXPERIMENT_EXAMPLE_PREVIEW_MAX_LENGTH),
      truncated: true,
    };
    const shortInput = { content: '{"prompt":"c"}', truncated: false };
    const shortOutput = { content: '{"short":"value"}', truncated: false };
    evaluationScoreService.search.mockResolvedValueOnce({
      hits: {
        hits: [
          { _source: makeScore('example-b', 2, 'eval-1') },
          { _source: makeScore('example-a', 1, 'eval-1') },
          { _source: makeScore('example-c', 3, 'eval-1') },
        ],
      },
      aggregations: {
        previews: {
          buckets: [
            {
              key: 'example-a',
              repetitions: {
                buckets: [
                  {
                    key: 1,
                    source: {
                      hits: {
                        hits: [
                          {
                            _source: { task: { repetition_index: 1 } },
                            fields: {
                              input_preview: [shortInput],
                              output_preview: [shortOutput],
                            },
                          },
                        ],
                      },
                    },
                  },
                  {
                    key: 0,
                    source: {
                      hits: {
                        hits: [
                          {
                            _source: { task: { repetition_index: 0 } },
                            fields: {
                              input_preview: [truncatedInput],
                              output_preview: [truncatedOutput],
                            },
                          },
                        ],
                      },
                    },
                  },
                ],
              },
            },
            {
              key: 'example-b',
              repetitions: {
                buckets: [
                  {
                    key: 1,
                    source: {
                      hits: {
                        hits: [
                          {
                            _source: { task: { repetition_index: 1 } },
                            fields: { input_preview: [null], output_preview: [null] },
                          },
                        ],
                      },
                    },
                  },
                ],
              },
            },
            {
              key: 'missing-example',
              repetitions: {
                buckets: [
                  {
                    key: 0,
                    source: {
                      hits: {
                        hits: [
                          {
                            _source: { task: { repetition_index: 0 } },
                            fields: {
                              input_preview: [shortInput],
                              output_preview: [shortOutput],
                            },
                          },
                        ],
                      },
                    },
                  },
                ],
              },
            },
            {
              key: 'example-c',
              repetitions: {
                buckets: [
                  {
                    key: 2,
                    source: {
                      hits: {
                        hits: [
                          {
                            fields: { input_preview: [shortInput], output_preview: [shortOutput] },
                          },
                        ],
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    } as any);

    const response = await handler(
      context,
      makeRequest('experiment-123', 'dataset-123', { include_previews: true }),
      kibanaResponseFactory
    );

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
      aggs: {
        previews: {
          terms: { field: 'example.id', size: 10000 },
          aggs: {
            repetitions: {
              terms: {
                field: 'task.repetition_index',
                size: EXPERIMENT_LIMITS.maxRepetitions,
                order: { _key: 'asc' },
              },
              aggs: {
                source: {
                  top_hits: {
                    size: 1,
                    sort: EXAMPLE_REPETITION_PAYLOAD_SORT,
                    _source: { includes: ['task.repetition_index'] },
                    script_fields: {
                      input_preview: previewScriptField('example', 'input'),
                      output_preview: previewScriptField('task', 'output'),
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    expect(response.payload.examples[0].previews).toEqual([
      {
        repetition_index: 0,
        input: truncatedInput,
        output: truncatedOutput,
      },
      {
        repetition_index: 1,
        input: shortInput,
        output: shortOutput,
      },
    ]);
    expect(response.payload.examples[1].previews).toEqual([
      {
        repetition_index: 1,
        input: null,
        output: null,
      },
    ]);
    expect(response.payload.examples[2].previews).toEqual([
      {
        repetition_index: 2,
        input: shortInput,
        output: shortOutput,
      },
    ]);
    expect(response.payload.examples).toHaveLength(3);
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
