/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  context,
  metrics as metricsApi,
  propagation,
  trace,
  SpanStatusCode,
} from '@opentelemetry/api';
import { AsyncHooksContextManager } from '@opentelemetry/context-async-hooks';
import { core as otelCore, metrics, resources, tracing } from '@elastic/opentelemetry-node/sdk';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { errors } from '@elastic/elasticsearch';
import {
  getInferenceTracer,
  initInferenceTracerProvider,
  shutdownInferenceTracerProvider,
  withInferenceContext,
} from '@kbn/inference-tracing';
import type {
  SemanticLogSearchParams,
  SemanticLogSearchResult,
} from '../../../common/services/semantic_log_search/types';
import { createSemanticSearchTelemetry, TELEMETRY_SCOPE } from './telemetry';
import { createSemanticLogSearchService, search } from './service';
import { searchDeps } from './test_helpers';
import { configSchema } from '../../config';
import type { RegisterServicesParams } from '../register_services';

class TestMetricReader extends metrics.MetricReader {
  protected async onForceFlush(): Promise<void> {}
  protected async onShutdown(): Promise<void> {}
}

describe('semantic log search telemetry', () => {
  let exporter: tracing.InMemorySpanExporter;
  let provider: tracing.BasicTracerProvider;
  let reader: TestMetricReader;
  let meterProvider: metrics.MeterProvider;
  let telemetry: ReturnType<typeof createSemanticSearchTelemetry>;
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let params: SemanticLogSearchParams;

  beforeEach(() => {
    context.setGlobalContextManager(new AsyncHooksContextManager().enable());
    exporter = new tracing.InMemorySpanExporter();
    provider = new tracing.BasicTracerProvider({
      spanProcessors: [new tracing.SimpleSpanProcessor(exporter)],
    });
    trace.setGlobalTracerProvider(provider);
    reader = new TestMetricReader();
    meterProvider = new metrics.MeterProvider({ readers: [reader] });
    telemetry = createSemanticSearchTelemetry(meterProvider.getMeter(TELEMETRY_SCOPE));
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.fieldCaps.mockResolvedValue({
      indices: ['private-logs'],
      fields: {
        message: { text: { type: 'text', searchable: true, aggregatable: false } },
        '@timestamp': { date: { type: 'date', searchable: true, aggregatable: true } },
      },
    });
    esClient.inference.get.mockResolvedValue({
      endpoints: [
        {
          inference_id: '.rerank-v1-elasticsearch',
          task_type: 'rerank',
          service: 'elasticsearch',
          service_settings: {},
          task_settings: {},
        },
      ],
    });
    esClient.esql.query.mockResolvedValue({
      columns: [{ name: 'total', type: 'long' }],
      values: [[0]],
    });
    params = {
      esClient,
      target: 'private-logs',
      nlQuery: 'SECRET question',
      kqlFilter: 'message: "SECRET filter"',
      timeRange: { start: 1704067200000, end: 1704153600000 },
    };
  });

  afterEach(async () => {
    await shutdownInferenceTracerProvider();
    await provider.shutdown();
    await meterProvider.shutdown();
    trace.disable();
    context.disable();
    jest.restoreAllMocks();
  });

  const execute = () =>
    telemetry.search((observation) => search(params, { ...searchDeps(), observation }));
  const rootSpan = () =>
    exporter.getFinishedSpans().find(({ name }) => name === 'semantic_log_search.search');
  const summaryOf = (span?: tracing.ReadableSpan) =>
    Object.fromEntries(
      Object.entries(span?.attributes ?? {})
        .filter(([key]) => key.startsWith(`${TELEMETRY_SCOPE}.`))
        .map(([key, value]) => [key.slice(TELEMETRY_SCOPE.length + 1), value])
    );
  const summary = () => summaryOf(rootSpan());
  const readMetric = async (suffix: string) => {
    const result = await reader.collect();
    return result.resourceMetrics.scopeMetrics
      .flatMap(({ metrics: collected }) => collected)
      .find(({ descriptor }) => descriptor.name === `${TELEMETRY_SCOPE}.${suffix}`);
  };

  it('instruments the runtime service factory', async () => {
    const service = createSemanticLogSearchService({
      logger: searchDeps().logger,
      config: configSchema.validate({}),
      deps: { savedObjects: {}, uiSettings: {} } as RegisterServicesParams['deps'],
    });
    await expect(service.search(params)).resolves.toEqual({ status: 'success', patterns: [] });
    expect(summary()).toEqual(expect.objectContaining({ outcome: 'empty' }));
  });

  it('records one empty completion, an exact metric count and only the executed phases', async () => {
    await execute();
    expect(summary()).toEqual({
      outcome: 'empty',
      pattern_count: 0,
      caller: 'other',
      rerank_endpoint: '.rerank-v1-elasticsearch',
      rerank_service: 'elasticsearch',
      duration_ms: expect.any(Number),
    });
    expect(exporter.getFinishedSpans().map(({ name }) => name)).toEqual([
      'semantic_log_search.capabilities',
      'semantic_log_search.probe',
      'semantic_log_search.search',
    ]);
    expect(rootSpan()?.status.code).toBe(SpanStatusCode.OK);
    expect((await readMetric('requests'))?.dataPoints).toEqual([
      expect.objectContaining({
        value: 1,
        attributes: {
          outcome: 'empty',
          caller: 'other',
          rerank_endpoint: '.rerank-v1-elasticsearch',
        },
      }),
    ]);
    expect((await readMetric('active_requests'))?.dataPoints[0].value).toBe(0);
    expect((await readMetric('duration'))?.dataPoints[0].value).toEqual(
      expect.objectContaining({ count: 1, sum: expect.any(Number) })
    );
  });

  it('reports a custom rerank endpoint without its id and a missing one without a service', async () => {
    esClient.inference.get.mockResolvedValue({
      endpoints: [
        {
          inference_id: 'SECRET-cohere-reranker',
          task_type: 'rerank',
          service: 'cohere',
          service_settings: {},
          task_settings: {},
        },
      ],
    });
    await telemetry.search((observation) =>
      search(params, {
        ...searchDeps(),
        rerankInferenceId: 'SECRET-cohere-reranker',
        observation,
      })
    );
    expect(summary()).toEqual(
      expect.objectContaining({ rerank_endpoint: 'custom', rerank_service: 'cohere' })
    );

    exporter.reset();
    esClient.inference.get.mockResolvedValue({ endpoints: [] });
    await telemetry.search((observation) =>
      search(params, { ...searchDeps(), rerankInferenceId: '.jina-reranker-v3', observation })
    );
    expect(summary()).toEqual(
      expect.objectContaining({ outcome: 'unavailable', rerank_endpoint: '.jina-reranker-v3' })
    );
    expect(summary()).not.toHaveProperty('rerank_service');

    const requests = (await readMetric('requests'))?.dataPoints ?? [];
    expect(requests.map(({ attributes }) => attributes.rerank_endpoint).sort()).toEqual([
      '.jina-reranker-v3',
      'custom',
    ]);
    expect(
      JSON.stringify({ spans: exporter.getFinishedSpans().map(({ attributes }) => attributes) })
    ).not.toContain('SECRET');
  });

  it('keeps caught failures ERROR and omits request content and raw exception data', async () => {
    const error = new Error('SECRET query private-logs');
    error.name = 'SECRET custom error name';
    esClient.esql.query.mockRejectedValue(error);
    await expect(execute()).resolves.toEqual(
      expect.objectContaining({ status: 'error', reason: 'execution' })
    );
    expect(summary()).toEqual(
      expect.objectContaining({
        outcome: 'failed',
        reason: 'execution',
        failure_phase: 'probe',
        error_type: 'other',
      })
    );
    expect(rootSpan()?.status.code).toBe(SpanStatusCode.ERROR);
    const spans = exporter.getFinishedSpans();
    expect(spans.find(({ name }) => name === 'semantic_log_search.probe')?.status.code).toBe(
      SpanStatusCode.ERROR
    );
    const signals = JSON.stringify({
      spans: spans.map(({ attributes, events, status }) => ({ attributes, events, status })),
      metrics: (await reader.collect()).resourceMetrics,
    });
    expect(signals).not.toContain('SECRET');
    expect(signals).not.toContain('private-logs');
    expect(
      spans.find(({ name }) => name === 'semantic_log_search.probe')?.events[0].attributes
    ).toEqual({
      'exception.type': 'SemanticLogSearchError',
      'exception.message': 'Semantic log search phase failed',
    });
  });

  it('records a partial probe as a failure without changing its result', async () => {
    esClient.esql.query.mockResolvedValue({ is_partial: true, columns: [], values: [] });
    await expect(execute()).resolves.toEqual({ status: 'error', reason: 'scope_too_large' });
    expect(summary()).toEqual(
      expect.objectContaining({ failure_phase: 'probe', reason: 'scope_too_large' })
    );
    expect(
      exporter.getFinishedSpans().find(({ name }) => name.endsWith('.probe'))?.status.code
    ).toBe(SpanStatusCode.ERROR);
  });

  it.each([
    ['rejected', 'invalid_params'],
    ['unavailable', 'missing_fields'],
    ['cancelled', 'cancelled'],
  ] as const)('distinguishes %s without manufacturing an exception', async (outcome, reason) => {
    if (outcome === 'rejected') params.nlQuery = '';
    if (outcome === 'unavailable')
      esClient.fieldCaps.mockResolvedValue({ indices: ['private-logs'], fields: {} });
    if (outcome === 'cancelled')
      esClient.fieldCaps.mockRejectedValue(new errors.RequestAbortedError('SECRET cancelled'));
    await execute();
    expect(summary()).toEqual(expect.objectContaining({ outcome, reason }));
    expect(rootSpan()?.status.code).toBe(SpanStatusCode.UNSET);
    expect(exporter.getFinishedSpans().flatMap(({ events }) => events)).toEqual([]);
  });

  it('retains the timeout classification', async () => {
    esClient.fieldCaps.mockRejectedValue(new errors.TimeoutError('SECRET timeout'));
    await execute();
    expect(summary()).toEqual(
      expect.objectContaining({
        outcome: 'failed',
        reason: 'timeout',
        failure_phase: 'capabilities',
        error_type: 'TimeoutError',
      })
    );
  });

  it('records successful sampled retrieval and parents phases under the service span', async () => {
    esClient.esql.query
      .mockResolvedValueOnce({ columns: [{ name: 'total', type: 'long' }], values: [[1_000_000]] })
      .mockResolvedValue({
        columns: [
          { name: 'count', type: 'long' },
          { name: 'first_seen', type: 'date' },
          { name: 'last_seen', type: 'date' },
          { name: 'sample', type: 'keyword' },
          { name: 'pattern', type: 'keyword' },
        ],
        values: [[100, '2024-01-01', '2024-01-02', 'SECRET log', 'SECRET pattern']],
      });
    esClient.inference.rerank.mockResolvedValue({ rerank: [{ index: 0, relevance_score: 0.8 }] });
    const result = await execute();
    expect(result.status).toBe('success');
    expect(summary()).toEqual(
      expect.objectContaining({
        outcome: 'success',
        sampled: true,
        pattern_count: 1,
        candidate_count: 1,
        selected_candidate_count: 1,
        candidates_capped: false,
      })
    );
    const root = rootSpan();
    const spans = exporter.getFinishedSpans();
    const collect = spans.find(({ name }) => name.endsWith('.collect_candidates'));
    for (const span of spans.filter(({ name }) => name !== 'semantic_log_search.search')) {
      expect(span.spanContext().traceId).toBe(root?.spanContext().traceId);
      expect(span.parentSpanContext?.spanId).toBe(
        span.name.endsWith('.categorize')
          ? collect?.spanContext().spanId
          : root?.spanContext().spanId
      );
    }
    const passes = spans.filter(({ name }) => name.endsWith('.categorize'));
    expect(passes.map(({ attributes }) => attributes[`${TELEMETRY_SCOPE}.pass`])).toEqual([
      'head',
      'rare',
    ]);
    expect(passes[0].attributes[`${TELEMETRY_SCOPE}.sampling_probability`]).toBeLessThan(1);
    expect(
      JSON.stringify(spans.map(({ attributes, events }) => ({ attributes, events })))
    ).not.toContain('SECRET');
  });

  it('uses the inference provider and preserves an existing tool parent', async () => {
    const inferenceExporter = new tracing.InMemorySpanExporter();
    initInferenceTracerProvider({
      processors: [new tracing.SimpleSpanProcessor(inferenceExporter)],
      resource: resources.resourceFromAttributes({}),
    });
    await withInferenceContext(() =>
      getInferenceTracer().startActiveSpan('execute_tool', async (span) => {
        await execute();
        span.end();
      })
    );
    const spans = inferenceExporter.getFinishedSpans();
    expect(exporter.getFinishedSpans()).toHaveLength(0);
    const parent = spans.find(({ name }) => name === 'execute_tool');
    const service = spans.find(({ name }) => name === 'semantic_log_search.search');
    expect(service?.parentSpanContext?.spanId).toBe(parent?.spanContext().spanId);
    expect(service?.spanContext().traceId).toBe(parent?.spanContext().traceId);
    expect(summaryOf(service)).toEqual(expect.objectContaining({ caller: 'inference' }));
  });

  it('reports candidate selection and a possible row-limit truncation without exporting patterns', async () => {
    esClient.esql.query
      .mockResolvedValueOnce({ columns: [{ name: 'total', type: 'long' }], values: [[1000]] })
      .mockResolvedValueOnce({
        columns: [
          { name: 'count', type: 'long' },
          { name: 'pattern', type: 'keyword' },
          { name: 'first_seen', type: 'date' },
          { name: 'last_seen', type: 'date' },
        ],
        values: Array.from({ length: 1000 }, (_, index) => [
          1,
          `SECRET pattern ${index}`,
          '2024-01-01',
          '2024-01-02',
        ]),
      });
    esClient.inference.rerank.mockResolvedValue({ rerank: [] });
    await execute();
    expect(summary()).toEqual(
      expect.objectContaining({
        sampled: false,
        candidate_count: 1000,
        selected_candidate_count: 500,
        candidates_capped: true,
        categorize_row_limit_reached: true,
      })
    );
    const categorize = exporter.getFinishedSpans().find(({ name }) => name.endsWith('.categorize'));
    expect(categorize?.attributes).toEqual(
      expect.objectContaining({
        [`${TELEMETRY_SCOPE}.pass`]: 'single',
        [`${TELEMETRY_SCOPE}.row_count`]: 1000,
        [`${TELEMETRY_SCOPE}.row_limit_reached`]: true,
      })
    );
  });

  it('keeps completion counts when traces are not sampled', async () => {
    trace.disable();
    const unsampled = new tracing.BasicTracerProvider({
      sampler: new tracing.AlwaysOffSampler(),
      spanProcessors: [new tracing.SimpleSpanProcessor(exporter)],
    });
    trace.setGlobalTracerProvider(unsampled);
    await execute();
    expect(exporter.getFinishedSpans()).toHaveLength(0);
    expect((await readMetric('requests'))?.dataPoints[0].value).toBe(1);
    await unsampled.shutdown();
  });

  it('respects shared tracing suppression while retaining completion metrics', async () => {
    await context.with(otelCore.suppressTracing(context.active()), execute);
    expect(exporter.getFinishedSpans()).toHaveLength(0);
    expect((await readMetric('requests'))?.dataPoints[0].value).toBe(1);
  });

  it.each([
    new errors.RequestAbortedError('SECRET cancellation'),
    Object.assign(new Error('SECRET cancellation'), { name: 'AbortError' }),
    Object.assign(new Error('SECRET cancellation'), { name: 'RequestAbortedError' }),
  ])('preserves an unexpected cancellation without counting it as a failure: %s', async (error) => {
    await expect(
      telemetry.search(async () => {
        throw error;
      })
    ).rejects.toBe(error);
    expect(summary()).toEqual(
      expect.objectContaining({ outcome: 'cancelled', reason: 'cancelled' })
    );
    expect(rootSpan()?.status.code).toBe(SpanStatusCode.UNSET);
    expect(rootSpan()?.events).toEqual([]);
  });

  it('isolates concurrent requests and balances active requests after an unexpected throw', async () => {
    let finish: (value: SemanticLogSearchResult) => void = () => {};
    const pending = new Promise<SemanticLogSearchResult>((resolve) => {
      finish = resolve;
    });
    const first = telemetry.search(async (observation) => {
      observation.evidence({ sampled: true });
      return pending;
    });
    const error = new Error('SECRET unexpected');
    await expect(
      telemetry.search(async () => {
        throw error;
      })
    ).rejects.toBe(error);
    expect((await readMetric('active_requests'))?.dataPoints[0].value).toBe(1);
    finish({ status: 'success', patterns: [] });
    await first;
    expect((await readMetric('active_requests'))?.dataPoints[0].value).toBe(0);
    expect(
      exporter
        .getFinishedSpans()
        .filter(({ name }) => name === 'semantic_log_search.search')
        .map(summaryOf)
    ).toEqual([
      expect.objectContaining({ outcome: 'failed' }),
      expect.objectContaining({ outcome: 'empty', sampled: true }),
    ]);
    expect(summary()).not.toHaveProperty('sampled');
    expect(JSON.stringify(exporter.getFinishedSpans().map(({ events }) => events))).not.toContain(
      'SECRET'
    );
  });

  it('does not expose raw errors through shared tracing when ending a span fails', async () => {
    const tracer = provider.getTracer('span-end-failure');
    const startSpan = tracer.startSpan.bind(tracer);
    jest.spyOn(provider, 'getTracer').mockReturnValue(tracer);
    jest.spyOn(tracer, 'startSpan').mockImplementation((...args) => {
      const span = startSpan(...args);
      jest.spyOn(span, 'end').mockImplementationOnce(() => {
        throw new Error('span end failed');
      });
      return span;
    });
    esClient.esql.query.mockRejectedValue(new Error('SECRET query and customer data'));
    await expect(execute()).resolves.toEqual(
      expect.objectContaining({ status: 'error', reason: 'execution' })
    );
    expect(esClient.esql.query).toHaveBeenCalledTimes(1);
    expect(exporter.getFinishedSpans()).toHaveLength(3);
    expect(
      JSON.stringify(exporter.getFinishedSpans().map(({ events, status }) => ({ events, status })))
    ).not.toContain('SECRET');
    expect(summary()).toEqual(expect.objectContaining({ outcome: 'failed' }));
  });

  it('does not execute requests twice when tracing fails', async () => {
    jest.spyOn(provider, 'getTracer').mockImplementation(() => {
      throw new Error('tracing failed');
    });
    await expect(execute()).resolves.toEqual({ status: 'success', patterns: [] });
    expect(esClient.esql.query).toHaveBeenCalledTimes(1);
    expect((await readMetric('requests'))?.dataPoints[0].value).toBe(1);
  });

  it('preserves results and spans when a metric instrument throws', async () => {
    const meter = meterProvider.getMeter('failing_metric');
    const counter = meter.createCounter('failing_counter');
    jest.spyOn(counter, 'add').mockImplementation(() => {
      throw new Error('metric failed');
    });
    jest.spyOn(meter, 'createCounter').mockReturnValue(counter);
    telemetry = createSemanticSearchTelemetry(meter);
    await expect(execute()).resolves.toEqual({ status: 'success', patterns: [] });
    expect(summary()).toEqual(expect.objectContaining({ outcome: 'empty' }));
    expect(rootSpan()?.status.code).toBe(SpanStatusCode.OK);
  });

  it('continues without metrics when the meter provider fails during initialization', async () => {
    jest.spyOn(metricsApi, 'getMeter').mockImplementation(() => {
      throw new Error('meter unavailable');
    });
    telemetry = createSemanticSearchTelemetry();
    await expect(execute()).resolves.toEqual({ status: 'success', patterns: [] });
    expect(summary()).toEqual(expect.objectContaining({ outcome: 'empty' }));
    expect(rootSpan()?.status.code).toBe(SpanStatusCode.OK);
  });

  it.each(['createCounter', 'createHistogram', 'createUpDownCounter'] as const)(
    'continues when %s fails during initialization',
    async (method) => {
      const meter = meterProvider.getMeter('initialization_failure');
      jest.spyOn(meter, method).mockImplementation(() => {
        throw new Error('instrument unavailable');
      });
      telemetry = createSemanticSearchTelemetry(meter);
      await expect(execute()).resolves.toEqual({ status: 'success', patterns: [] });
      expect(summary()).toEqual(expect.objectContaining({ outcome: 'empty' }));
      expect(rootSpan()?.status.code).toBe(SpanStatusCode.OK);
    }
  );

  it('runs the search when reading the tracing context fails', async () => {
    jest.spyOn(propagation, 'getBaggage').mockImplementation(() => {
      throw new Error('context unavailable');
    });
    await expect(execute()).resolves.toEqual({ status: 'success', patterns: [] });
    expect(esClient.esql.query).toHaveBeenCalledTimes(1);
    expect(summary()).toEqual(expect.objectContaining({ outcome: 'empty', caller: 'other' }));
  });
});
