/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { node, resources, tracing } from '@elastic/opentelemetry-node/sdk';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  createTestServers,
  getSupertest,
  type TestElasticsearchUtils,
  type TestKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';
import {
  EVALS_EVALUATE_URL,
  EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS,
  EVALS_ONLINE_EVALUATION_EVENTS_URL,
  GEN_AI_EVALUATION_RESULT_EVENT,
  type EvaluateRequestBodyInput,
  type EvaluateResponse,
  type ListOnlineEvaluationEventsResponse,
} from '@kbn/evals-common';
import { ElasticsearchOtlpExporter } from '@kbn/tracing';
import { ROOT_CONTEXT, SpanKind, trace, TraceFlags } from '@opentelemetry/api';

const LOGS_DATA_STREAM = 'logs-evals.otel-default';
const TRACES_DATA_STREAM = 'traces-evals.otel-default';
const EVALUATED_TRACE_ID = '0123456789abcdef0123456789abcdef';
const EVALUATED_SPAN_ID = '0123456789abcdef';
const EVALUATOR_TRACE_ID = 'fedcba9876543210fedcba9876543210';
const MONITOR_ID = 'workflow-events-1';
const MONITOR_NAME = 'Online evaluation events monitor';
const FIXTURE_TRACES_DATA_STREAM = 'traces-evals_fixture.otel-default';

interface EvaluationEventDocument {
  event_name: string;
  trace_id: string;
  span_id: string;
  attributes: Record<string, string | number>;
}

interface EvaluationSpanDocument {
  trace_id: string;
  span_id: string;
  parent_span_id: string;
}

const deleteDataStreams = async (esClient: ElasticsearchClient) => {
  await Promise.all(
    [LOGS_DATA_STREAM, TRACES_DATA_STREAM, FIXTURE_TRACES_DATA_STREAM].map((name) =>
      esClient.indices.deleteDataStream({ name }).catch(() => {})
    )
  );
};

describe('OTel evaluation event storage', () => {
  jest.setTimeout(180000);

  let manageES: TestElasticsearchUtils;
  let esClient: ElasticsearchClient;
  let kibanaServer: TestKibanaUtils;

  beforeAll(async () => {
    jest.useRealTimers();
    const { startES, startKibana } = createTestServers({
      adjustTimeout: jest.setTimeout,
      settings: {
        kbn: {
          cliArgs: { oss: false },
          xpack: {
            evals: { enabled: true },
          },
        },
      },
    });
    manageES = await startES();
    kibanaServer = await startKibana();
    esClient = kibanaServer.coreStart.elasticsearch.client.asInternalUser;
  });

  afterAll(async () => {
    if (esClient) {
      await deleteDataStreams(esClient);
    }
    await kibanaServer?.stop().catch(() => {});
    await manageES?.stop().catch(() => {});
  });

  beforeEach(async () => {
    await deleteDataStreams(esClient);
  });

  it('stores span events in logs and their parent span in traces', async () => {
    const provider = new node.NodeTracerProvider({
      resource: resources.resourceFromAttributes({
        'data_stream.dataset': 'evals',
        'data_stream.namespace': 'default',
      }),
      spanProcessors: [new tracing.SimpleSpanProcessor(new ElasticsearchOtlpExporter(esClient))],
    });
    const tracer = provider.getTracer('@kbn/evals.online');
    const parentContext = trace.setSpanContext(ROOT_CONTEXT, {
      traceId: EVALUATED_TRACE_ID,
      spanId: EVALUATED_SPAN_ID,
      traceFlags: TraceFlags.SAMPLED,
      isRemote: true,
    });
    const span = tracer.startSpan(
      'evals.online_evaluation',
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          'kibana.evals.monitor.id': 'monitor-1',
          'kibana.evals.monitor.name': 'Correctness monitor',
          'kibana.evals.space_id': 'default',
        },
      },
      parentContext
    );

    span.addEvent('gen_ai.evaluation.result', {
      'gen_ai.evaluation.name': 'correctness',
      'gen_ai.evaluation.score.value': 0.91,
      'gen_ai.evaluation.score.label': 'pass',
      'gen_ai.evaluation.explanation': 'The response is grounded in the evidence.',
      'kibana.evals.monitor.id': 'monitor-1',
      'kibana.evals.monitor.name': 'Correctness monitor',
      'kibana.evals.space_id': 'default',
      'kibana.evals.connector_id': 'connector-1',
      'kibana.evals.evaluator.name': 'correctness',
      'kibana.evals.evaluator.version': '1.0.0',
      'kibana.evals.evaluator.kind': 'llm',
      'kibana.evals.evaluator.direction': 'maximize',
      'kibana.evals.evaluator.model.id': 'model-1',
      'kibana.evals.evaluator.model.family': 'model-family',
      'kibana.evals.evaluator.model.provider': 'model-provider',
      'kibana.evals.evaluator.trace_id': EVALUATOR_TRACE_ID,
      'kibana.evals.score.metadata': JSON.stringify({ source: 'integration-test' }),
    });
    span.end();

    try {
      await provider.forceFlush();
      await esClient.indices.refresh({ index: [LOGS_DATA_STREAM, TRACES_DATA_STREAM] });

      const [eventResponse, spanResponse, scoreValueFieldCaps] = await Promise.all([
        esClient.search<EvaluationEventDocument>({
          index: LOGS_DATA_STREAM,
          query: { term: { event_name: 'gen_ai.evaluation.result' } },
        }),
        esClient.search<EvaluationSpanDocument>({
          index: TRACES_DATA_STREAM,
          query: { term: { trace_id: EVALUATED_TRACE_ID } },
        }),
        esClient.fieldCaps({
          index: LOGS_DATA_STREAM,
          fields: ['attributes.gen_ai.evaluation.score.value'],
        }),
      ]);

      expect(eventResponse.hits.hits).toHaveLength(1);
      expect(spanResponse.hits.hits).toHaveLength(1);

      const eventDocument = eventResponse.hits.hits[0]._source;
      const spanDocument = spanResponse.hits.hits[0]._source;
      expect(eventDocument).toBeDefined();
      expect(spanDocument).toBeDefined();

      expect(eventDocument).toMatchObject({
        event_name: 'gen_ai.evaluation.result',
        trace_id: EVALUATED_TRACE_ID,
        attributes: {
          'gen_ai.evaluation.name': 'correctness',
          'gen_ai.evaluation.score.value': 0.91,
          'gen_ai.evaluation.score.label': 'pass',
          'gen_ai.evaluation.explanation': 'The response is grounded in the evidence.',
          'kibana.evals.monitor.id': 'monitor-1',
          'kibana.evals.monitor.name': 'Correctness monitor',
          'kibana.evals.space_id': 'default',
          'kibana.evals.connector_id': 'connector-1',
          'kibana.evals.evaluator.name': 'correctness',
          'kibana.evals.evaluator.version': '1.0.0',
          'kibana.evals.evaluator.kind': 'llm',
          'kibana.evals.evaluator.direction': 'maximize',
          'kibana.evals.evaluator.model.id': 'model-1',
          'kibana.evals.evaluator.model.family': 'model-family',
          'kibana.evals.evaluator.model.provider': 'model-provider',
          'kibana.evals.evaluator.trace_id': EVALUATOR_TRACE_ID,
          'kibana.evals.score.metadata': '{"source":"integration-test"}',
        },
      });
      expect(typeof eventDocument?.span_id).toBe('string');
      expect(eventDocument?.span_id).toHaveLength(16);
      expect(typeof eventDocument?.attributes['gen_ai.evaluation.score.value']).toBe('number');
      expect(scoreValueFieldCaps.fields['attributes.gen_ai.evaluation.score.value']).toEqual({
        float: {
          type: 'float',
          searchable: true,
          aggregatable: true,
          metadata_field: false,
          inference: false,
        },
      });
      expect(spanDocument).toMatchObject({
        trace_id: EVALUATED_TRACE_ID,
        span_id: eventDocument?.span_id,
        parent_span_id: EVALUATED_SPAN_ID,
      });
    } finally {
      await provider.shutdown();
    }
  });

  /** Exports one root span as an evaluated trace and returns its ids. */
  const seedEvaluatedTrace = async (): Promise<{ traceId: string; rootSpanId: string }> => {
    const provider = new node.NodeTracerProvider({
      resource: resources.resourceFromAttributes({
        'data_stream.dataset': 'evals_fixture',
        'data_stream.namespace': 'default',
      }),
      spanProcessors: [new tracing.SimpleSpanProcessor(new ElasticsearchOtlpExporter(esClient))],
    });
    const startTime = Date.now() - 5000;
    const root = provider.getTracer('fixture').startSpan(
      'chat fixture-model',
      {
        kind: SpanKind.CLIENT,
        startTime,
        attributes: {
          'gen_ai.operation.name': 'chat',
          'elastic.inference.span.kind': 'LLM',
          'gen_ai.input.messages': JSON.stringify([
            { role: 'user', parts: [{ type: 'text', content: 'Is checkout healthy?' }] },
          ]),
          'gen_ai.output.messages': JSON.stringify([
            { role: 'assistant', parts: [{ type: 'text', content: 'Checkout is healthy.' }] },
          ]),
        },
      },
      ROOT_CONTEXT
    );
    root.end(startTime + 1500);

    try {
      await provider.forceFlush();
    } finally {
      await provider.shutdown();
    }
    await esClient.indices.refresh({ index: FIXTURE_TRACES_DATA_STREAM });

    const { traceId, spanId } = root.spanContext();
    return { traceId, rootSpanId: spanId };
  };

  const postEvaluate = async (body: EvaluateRequestBodyInput): Promise<EvaluateResponse> => {
    const response = await getSupertest(kibanaServer.root, 'post', EVALS_EVALUATE_URL)
      .set('kbn-xsrf', 'kibana')
      .set('x-elastic-internal-origin', 'kibana')
      .set('elastic-api-version', '1')
      .send(body)
      .expect(200);
    return response.body as EvaluateResponse;
  };

  it('emits, deduplicates, and lists evaluation events through the evaluate route', async () => {
    const { traceId, rootSpanId } = await seedEvaluatedTrace();
    const body: EvaluateRequestBodyInput = {
      subject: { traces: [{ trace_id: traceId }] },
      evaluators: [{ name: 'latency' }],
      emit: { monitor: { id: MONITOR_ID, name: MONITOR_NAME } },
    };

    const firstResponse = await postEvaluate(body);

    expect(firstResponse.results).toHaveLength(1);
    expect(firstResponse.results[0]).toMatchObject({
      status: 'ok',
      evaluator: { name: 'latency', version: '1.0.0', kind: 'code' },
    });
    expect(firstResponse.emission).toEqual({ emitted: 1, skipped_evaluators: [] });

    await esClient.indices.refresh({ index: [LOGS_DATA_STREAM, TRACES_DATA_STREAM] });
    const [storedEvents, evaluationSpans] = await Promise.all([
      esClient.search<EvaluationEventDocument>({
        index: LOGS_DATA_STREAM,
        query: {
          bool: {
            filter: [
              { term: { event_name: GEN_AI_EVALUATION_RESULT_EVENT } },
              { term: { trace_id: traceId } },
            ],
          },
        },
      }),
      esClient.search<EvaluationSpanDocument>({
        index: TRACES_DATA_STREAM,
        query: { term: { trace_id: traceId } },
      }),
    ]);

    expect(storedEvents.hits.hits).toHaveLength(1);
    expect(storedEvents.hits.hits[0]._source).toMatchObject({
      event_name: GEN_AI_EVALUATION_RESULT_EVENT,
      trace_id: traceId,
      attributes: {
        [EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.EVALUATION_NAME]: 'latency',
        [EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.MONITOR_ID]: MONITOR_ID,
        [EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.MONITOR_NAME]: MONITOR_NAME,
        [EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.SPACE_ID]: 'default',
        [EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.EVALUATOR_NAME]: 'latency',
        [EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.EVALUATOR_VERSION]: '1.0.0',
        [EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.EVALUATOR_KIND]: 'code',
      },
    });
    expect(storedEvents.hits.hits[0]._source?.attributes).not.toHaveProperty(
      EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.EVALUATOR_TRACE_ID
    );
    expect(evaluationSpans.hits.hits).toHaveLength(1);
    expect(evaluationSpans.hits.hits[0]._source).toMatchObject({
      trace_id: traceId,
      parent_span_id: rootSpanId,
    });

    const secondResponse = await postEvaluate(body);

    expect(secondResponse).toEqual({
      results: [],
      emission: { emitted: 0, skipped_evaluators: ['latency@1.0.0'] },
    });

    const listResponse = await getSupertest(
      kibanaServer.root,
      'get',
      `${EVALS_ONLINE_EVALUATION_EVENTS_URL}?monitor_id=${MONITOR_ID}&page=1&per_page=10`
    )
      .set('x-elastic-internal-origin', 'kibana')
      .expect(200);
    const listBody = listResponse.body as ListOnlineEvaluationEventsResponse;

    expect(listBody.total).toBe(1);
    expect(listBody.data).toEqual([
      expect.objectContaining({
        '@timestamp': expect.any(String),
        trace_id: traceId,
        monitor: { id: MONITOR_ID, name: MONITOR_NAME },
        evaluator: { name: 'latency', version: '1.0.0', kind: 'code' },
        score: expect.objectContaining({ name: 'latency' }),
      }),
    ]);
    expect(listBody.data.every(({ score }) => !('metadata' in score))).toBe(true);
  });
});
