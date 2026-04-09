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
import { EVALS_TRACING_PROJECTS_URL, API_VERSIONS, TRACES_INDEX_PATTERN } from '@kbn/evals-common';
import { registerGetTracingProjectsRoute } from './get_projects';

const buildProjectBucket = ({
  name,
  docCount = 10,
  distinctTraces = 5,
  lastTrace = '2025-06-01T12:00:00Z',
  p50 = 500_000_000,
  p99 = 2_000_000_000,
  inputTokens = 100,
  outputTokens = 200,
  errorDocCount = 1,
}: {
  name: string;
  docCount?: number;
  distinctTraces?: number;
  lastTrace?: string;
  p50?: number;
  p99?: number;
  inputTokens?: number;
  outputTokens?: number;
  errorDocCount?: number;
}) => ({
  key: name,
  doc_count: docCount,
  distinct_traces: { value: distinctTraces },
  last_trace: { value_as_string: lastTrace },
  latency_percentiles: { values: { '50.0': p50, '99.0': p99 } },
  total_input_tokens: { value: inputTokens },
  total_output_tokens: { value: outputTokens },
  error_count: { doc_count: errorDocCount },
});

describe('GET /internal/evals/tracing/projects', () => {
  const setup = () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    registerGetTracingProjectsRoute({ router, logger });

    const versionedRouter = router.versioned as MockedVersionedRouter;
    const { handler } = versionedRouter.getRoute('get', EVALS_TRACING_PROJECTS_URL).versions[
      API_VERSIONS.internal.v1
    ];

    const mockCoreContext = coreMock.createRequestHandlerContext();
    const context = coreMock.createCustomRequestHandlerContext({ core: mockCoreContext });
    const esClient = mockCoreContext.elasticsearch.client.asCurrentUser;

    return { handler, context, esClient, logger };
  };

  const makeRequest = (query: Record<string, unknown> = {}) =>
    httpServerMock.createKibanaRequest({
      method: 'get',
      path: EVALS_TRACING_PROJECTS_URL,
      query: { page: 1, per_page: 25, ...query },
    });

  it('queries traces-* index with size 0 and aggregations', async () => {
    const { handler, context, esClient } = setup();
    esClient.search.mockResolvedValueOnce({
      aggregations: {
        project_count: { value: 0 },
        projects: { buckets: [] },
      },
    } as any);

    await handler(context, makeRequest(), kibanaResponseFactory);

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: TRACES_INDEX_PATTERN,
        size: 0,
      })
    );
  });

  it('filters root spans only (must_not parent_span_id and evaluator.name)', async () => {
    const { handler, context, esClient } = setup();
    esClient.search.mockResolvedValueOnce({
      aggregations: {
        project_count: { value: 0 },
        projects: { buckets: [] },
      },
    } as any);

    await handler(context, makeRequest(), kibanaResponseFactory);

    const searchCall = esClient.search.mock.calls[0][0] as any;
    expect(searchCall.query.bool.must_not).toEqual([
      { exists: { field: 'parent_span_id' } },
      { exists: { field: 'attributes.evaluator.name' } },
    ]);
  });

  it('applies time range filter when from/to provided', async () => {
    const { handler, context, esClient } = setup();
    esClient.search.mockResolvedValueOnce({
      aggregations: {
        project_count: { value: 0 },
        projects: { buckets: [] },
      },
    } as any);

    await handler(
      context,
      makeRequest({ from: '2025-01-01T00:00:00Z', to: '2025-06-01T00:00:00Z' }),
      kibanaResponseFactory
    );

    const searchCall = esClient.search.mock.calls[0][0] as any;
    const filters = searchCall.query.bool.filter;
    expect(filters).toEqual(
      expect.arrayContaining([
        { range: { '@timestamp': { gte: '2025-01-01T00:00:00Z', lte: '2025-06-01T00:00:00Z' } } },
      ])
    );
  });

  it('returns parsed projects with correct field mappings', async () => {
    const { handler, context, esClient } = setup();
    esClient.search.mockResolvedValueOnce({
      aggregations: {
        project_count: { value: 1 },
        projects: {
          buckets: [
            buildProjectBucket({
              name: 'alert-summarization',
              distinctTraces: 42,
              lastTrace: '2025-06-15T10:30:00Z',
              p50: 500_000_000,
              p99: 3_000_000_000,
              inputTokens: 5000,
              outputTokens: 3000,
              errorDocCount: 2,
            }),
          ],
        },
      },
    } as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload.total).toBe(1);
    expect(response.payload.projects).toHaveLength(1);

    const project = response.payload.projects[0];
    expect(project.name).toBe('alert-summarization');
    expect(project.trace_count).toBe(42);
    expect(project.last_trace_time).toBe('2025-06-15T10:30:00Z');
    expect(project.p50_latency_ms).toBe(500);
    expect(project.p99_latency_ms).toBe(3000);
    expect(project.total_tokens).toBe(8000);
    expect(project.error_rate).toBeCloseTo(2 / 42, 2);
  });

  it('paginates aggregation buckets correctly', async () => {
    const { handler, context, esClient } = setup();
    const buckets = Array.from({ length: 30 }, (_, i) =>
      buildProjectBucket({ name: `project-${i}` })
    );
    esClient.search.mockResolvedValueOnce({
      aggregations: {
        project_count: { value: 30 },
        projects: { buckets },
      },
    } as any);

    const response = await handler(
      context,
      makeRequest({ page: 2, per_page: 10 }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload.total).toBe(30);
    expect(response.payload.projects).toHaveLength(10);
    expect(response.payload.projects[0].name).toBe('project-10');
    expect(response.payload.projects[9].name).toBe('project-19');
  });

  it('returns empty projects when no aggregation buckets', async () => {
    const { handler, context, esClient } = setup();
    esClient.search.mockResolvedValueOnce({
      aggregations: {
        project_count: { value: 0 },
        projects: { buckets: [] },
      },
    } as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload.total).toBe(0);
    expect(response.payload.projects).toEqual([]);
  });

  it('handles zero trace count without dividing by zero for error_rate', async () => {
    const { handler, context, esClient } = setup();
    esClient.search.mockResolvedValueOnce({
      aggregations: {
        project_count: { value: 1 },
        projects: {
          buckets: [buildProjectBucket({ name: 'empty-project', distinctTraces: 0 })],
        },
      },
    } as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload.projects[0].error_rate).toBe(0);
  });

  it('converts latency from nanoseconds to milliseconds', async () => {
    const { handler, context, esClient } = setup();
    esClient.search.mockResolvedValueOnce({
      aggregations: {
        project_count: { value: 1 },
        projects: {
          buckets: [
            buildProjectBucket({
              name: 'latency-test',
              p50: 1_500_000_000,
              p99: 10_000_000_000,
            }),
          ],
        },
      },
    } as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.payload.projects[0].p50_latency_ms).toBe(1500);
    expect(response.payload.projects[0].p99_latency_ms).toBe(10000);
  });

  it('returns 500 when ES throws', async () => {
    const { handler, context, esClient, logger } = setup();
    esClient.search.mockRejectedValueOnce(new Error('ES connection failed'));

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(500);
    expect(response.payload).toEqual({ message: 'Failed to get tracing projects' });
    expect(logger.error).toHaveBeenCalled();
  });
});
