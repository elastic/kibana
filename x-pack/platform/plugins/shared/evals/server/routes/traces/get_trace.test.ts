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
  EVALS_TRACE_URL,
  API_VERSIONS,
  TRACES_INDEX_PATTERN,
  buildSpaceFilter,
} from '@kbn/evals-common';
import type { KibanaRequest } from '@kbn/core/server';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { createEvaluatorRegistryMock } from '../../evaluators/registry.mock';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { registerGetTraceRoute } from './get_trace';

describe('GET /internal/evals/traces/{traceId}', () => {
  const setup = ({ spaceId }: { spaceId?: string } = {}) => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    registerGetTraceRoute({
      router,
      logger,
      ...(spaceId ? { getSpaceId: async (_request: KibanaRequest) => spaceId } : {}),
      canEncrypt: false,
      evaluatorRegistry: createEvaluatorRegistryMock(),
      getInferenceStart: async () => ({ getClient: jest.fn() } as unknown as InferenceServerStart),
      getEncryptedSavedObjectsStart: async () => encryptedSavedObjectsMock.createStart(),
      getInternalRemoteConfigsSoClient: async () => savedObjectsClientMock.create(),
    });

    const versionedRouter = router.versioned as MockedVersionedRouter;
    const { handler } = versionedRouter.getRoute('get', EVALS_TRACE_URL).versions[
      API_VERSIONS.internal.v1
    ];

    // No score references any trace unless a test says so.
    const noHits = { hits: { total: { value: 0 }, hits: [] } };
    const evaluationScoreService = { search: jest.fn().mockResolvedValue(noHits) };
    const onlineScoreService = { search: jest.fn().mockResolvedValue(noHits) };
    const mockCoreContext = coreMock.createRequestHandlerContext();
    const context = coreMock.createCustomRequestHandlerContext({
      core: mockCoreContext,
      evals: { evaluationScoreService, onlineScoreService } as any,
    });
    const esClient = mockCoreContext.elasticsearch.client.asCurrentUser;

    return { handler, context, esClient, logger, evaluationScoreService, onlineScoreService };
  };

  const makeRequest = (traceId = 'trace-abc') =>
    httpServerMock.createKibanaRequest({
      method: 'get',
      path: EVALS_TRACE_URL.replace('{traceId}', traceId),
      params: { traceId },
    });

  it('reads the default space traces, filtered to its namespace, without a space', async () => {
    const { handler, context, esClient } = setup();
    esClient.search.mockResolvedValueOnce({ hits: { hits: [] } } as any);

    await handler(context, makeRequest('trace-xyz'), kibanaResponseFactory);

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'traces-*-default',
        query: {
          bool: {
            filter: [
              { term: { trace_id: 'trace-xyz' } },
              { term: { 'data_stream.namespace': 'default' } },
            ],
          },
        },
        size: 10000,
      })
    );
  });

  it('reads only the active space traces', async () => {
    const { handler, context, esClient } = setup({ spaceId: 'marketing' });
    esClient.search.mockResolvedValueOnce({ hits: { hits: [] } } as any);

    await handler(context, makeRequest('trace-xyz'), kibanaResponseFactory);

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'traces-*-marketing',
        query: {
          bool: {
            filter: [
              { term: { trace_id: 'trace-xyz' } },
              { term: { 'data_stream.namespace': 'marketing' } },
            ],
          },
        },
      })
    );
  });

  it('reads a trace wherever it was written when a score visible in the space references it', async () => {
    const { handler, context, esClient, evaluationScoreService } = setup({
      spaceId: 'marketing',
    });
    evaluationScoreService.search.mockResolvedValueOnce({
      hits: { total: { value: 1 }, hits: [] },
    });
    esClient.search.mockResolvedValueOnce({ hits: { hits: [] } } as any);

    await handler(context, makeRequest('trace-xyz'), kibanaResponseFactory);

    expect(evaluationScoreService.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            filter: [buildSpaceFilter('marketing')],
            should: [
              { term: { 'task.trace_id': 'trace-xyz' } },
              { term: { 'evaluator.trace_id': 'trace-xyz' } },
            ],
            minimum_should_match: 1,
          },
        },
      })
    );
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: TRACES_INDEX_PATTERN,
        query: { bool: { filter: [{ term: { trace_id: 'trace-xyz' } }] } },
      })
    );
  });

  it('reads a trace wherever it was written when an online score references it', async () => {
    const { handler, context, esClient, onlineScoreService } = setup({ spaceId: 'marketing' });
    onlineScoreService.search.mockResolvedValueOnce({ hits: { total: { value: 2 }, hits: [] } });
    esClient.search.mockResolvedValueOnce({ hits: { hits: [] } } as any);

    await handler(context, makeRequest('trace-xyz'), kibanaResponseFactory);

    expect(onlineScoreService.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            filter: [{ term: { trace_id: 'trace-xyz' } }, { term: { space_ids: 'marketing' } }],
          },
        },
      })
    );
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ index: TRACES_INDEX_PATTERN })
    );
  });

  it('converts duration from nanoseconds to milliseconds', async () => {
    const { handler, context, esClient } = setup();
    esClient.search.mockResolvedValueOnce({
      hits: {
        hits: [
          {
            _id: 'span-1',
            _source: {
              span_id: 'span-1',
              trace_id: 'trace-abc',
              name: 'llm.call',
              '@timestamp': '2025-06-01T00:00:00Z',
              duration: 5_000_000,
            },
          },
        ],
      },
    } as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload.spans[0].duration_ms).toBe(5);
  });

  it('returns span fields correctly mapped', async () => {
    const { handler, context, esClient } = setup();
    esClient.search.mockResolvedValueOnce({
      hits: {
        hits: [
          {
            _id: 'span-1',
            _source: {
              span_id: 'span-1',
              parent_span_id: 'parent-1',
              trace_id: 'trace-abc',
              name: 'evaluator.run',
              kind: 'INTERNAL',
              status: { code: 'OK' },
              '@timestamp': '2025-06-01T00:00:00Z',
              duration: 10_000_000,
              attributes: { 'gen_ai.system': 'openai' },
            },
          },
        ],
      },
    } as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);
    const span = response.payload.spans[0];

    expect(span).toEqual({
      span_id: 'span-1',
      parent_span_id: 'parent-1',
      trace_id: 'trace-abc',
      name: 'evaluator.run',
      kind: 'INTERNAL',
      status: 'OK',
      start_time: '2025-06-01T00:00:00Z',
      duration_ms: 10,
      attributes: { 'gen_ai.system': 'openai' },
    });
  });

  it('returns empty spans array when no hits', async () => {
    const { handler, context, esClient } = setup();
    esClient.search.mockResolvedValueOnce({ hits: { hits: [] } } as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload.trace_id).toBe('trace-abc');
    expect(response.payload.spans).toEqual([]);
    expect(response.payload.total_spans).toBe(0);
    expect(response.payload.duration_ms).toBe(0);
  });

  it('computes total duration as latestEnd minus earliestStart', async () => {
    const { handler, context, esClient } = setup();
    esClient.search.mockResolvedValueOnce({
      hits: {
        hits: [
          {
            _id: 's1',
            _source: {
              span_id: 's1',
              trace_id: 'trace-abc',
              name: 'a',
              '@timestamp': '2025-06-01T00:00:00.000Z',
              duration: 2_000_000,
            },
          },
          {
            _id: 's2',
            _source: {
              span_id: 's2',
              trace_id: 'trace-abc',
              name: 'b',
              '@timestamp': '2025-06-01T00:00:05.000Z',
              duration: 3_000_000,
            },
          },
        ],
      },
    } as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.payload.total_spans).toBe(2);
    // span s2 starts at T+5s and lasts 3ms, so latestEnd = 5003ms, earliestStart = 0ms
    expect(response.payload.duration_ms).toBe(5003);
  });

  it('uses hit _id as span_id when source has no span_id', async () => {
    const { handler, context, esClient } = setup();
    esClient.search.mockResolvedValueOnce({
      hits: {
        hits: [
          {
            _id: 'fallback-id',
            _source: {
              trace_id: 'trace-abc',
              name: 'test',
              '@timestamp': '2025-06-01T00:00:00Z',
              duration: 1_000_000,
            },
          },
        ],
      },
    } as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);
    expect(response.payload.spans[0].span_id).toBe('fallback-id');
  });

  it('returns 500 when ES throws', async () => {
    const { handler, context, esClient, logger } = setup();
    esClient.search.mockRejectedValueOnce(new Error('ES error'));

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(500);
    expect(logger.error).toHaveBeenCalled();
  });

  it('returns an actionable 400 and logs at warn when the ES response is too large', async () => {
    const { handler, context, esClient, logger } = setup();
    esClient.search.mockRejectedValueOnce(
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
