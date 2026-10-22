/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tracing } from '@elastic/opentelemetry-node/sdk';
import { GEN_AI_EVALUATION_RESULT_EVENT } from '@kbn/evals-common';
import { SpanKind } from '@opentelemetry/api';
import { EvaluationEventsEmitter } from './evaluation_events_emitter';

const EVALUATED_TRACE_ID = '0af7651916cd43dd8448eb211c8031ab';
const EVALUATED_SPAN_ID = 'b7ad6b7169203331';

describe('EvaluationEventsEmitter', () => {
  it('exports evaluation events on a child span with the evals resource', async () => {
    const exporter = new tracing.InMemorySpanExporter();
    const emitter = new EvaluationEventsEmitter(new tracing.SimpleSpanProcessor(exporter));

    const response = await emitter.emit({
      spaceId: 'space-a',
      monitor: { id: 'monitor-1', name: 'Correctness monitor' },
      traceId: EVALUATED_TRACE_ID,
      spanId: EVALUATED_SPAN_ID,
      connectorIdByEvaluator: new Map([['correctness', 'connector-1']]),
      results: [
        {
          status: 'ok',
          evaluator: {
            name: 'correctness',
            version: '1.0.0',
            kind: 'llm',
          },
          scores: [
            { name: 'factuality', score: 0.9, label: 'pass' },
            { name: 'relevance', score: 0.8, label: 'pass' },
          ],
        },
        {
          status: 'error',
          evaluator: {
            name: 'toxicity',
            version: '1.0.0',
            kind: 'code',
          },
          error: { message: 'Evaluation failed' },
        },
      ],
    });

    expect(response).toEqual({ emitted: 2 });
    const [span] = exporter.getFinishedSpans();
    expect(span.name).toBe('evals.online_evaluation');
    expect(span.kind).toBe(SpanKind.INTERNAL);
    expect(span.spanContext().traceId).toBe(EVALUATED_TRACE_ID);
    expect(span.parentSpanContext?.spanId).toBe(EVALUATED_SPAN_ID);
    expect(span.events).toHaveLength(2);
    expect(span.events.map(({ name }) => name)).toEqual([
      GEN_AI_EVALUATION_RESULT_EVENT,
      GEN_AI_EVALUATION_RESULT_EVENT,
    ]);
    expect(span.events[0].attributes).toEqual(
      expect.objectContaining({
        'gen_ai.evaluation.name': 'factuality',
        'kibana.evals.connector_id': 'connector-1',
      })
    );
    expect(span.attributes).toEqual({
      'kibana.evals.monitor.id': 'monitor-1',
      'kibana.evals.monitor.name': 'Correctness monitor',
      'kibana.evals.space_id': 'space-a',
    });
    expect(span.attributes).not.toHaveProperty('gen_ai.operation.name');
    expect(span.attributes).not.toHaveProperty('elastic.inference.span.kind');
    expect(span.attributes).not.toHaveProperty('gen_ai.input.messages');
    expect(span.attributes).not.toHaveProperty('gen_ai.output.messages');
    expect(span.attributes).not.toHaveProperty('evaluator.name');
    expect(span.resource.attributes).toEqual(
      expect.objectContaining({
        'data_stream.dataset': 'evals',
        'data_stream.namespace': 'space-a',
      })
    );

    await emitter.shutdown();
  });

  it('sends the evaluation span to every processor', async () => {
    const first = new tracing.InMemorySpanExporter();
    const second = new tracing.InMemorySpanExporter();
    const emitter = new EvaluationEventsEmitter(
      new tracing.SimpleSpanProcessor(first),
      new tracing.SimpleSpanProcessor(second)
    );

    await emitter.emit({
      spaceId: 'default',
      monitor: { id: 'monitor-1', name: 'Monitor' },
      traceId: EVALUATED_TRACE_ID,
      spanId: EVALUATED_SPAN_ID,
      results: [
        {
          status: 'ok',
          evaluator: { name: 'latency', version: '1.0.0', kind: 'code' },
          scores: [{ name: 'latency', score: 1.5 }],
        },
      ],
    });

    expect(first.getFinishedSpans()).toHaveLength(1);
    expect(second.getFinishedSpans()).toHaveLength(1);
    expect(second.getFinishedSpans()[0].resource.attributes).toEqual(
      expect.objectContaining({ 'data_stream.dataset': 'evals' })
    );

    await emitter.shutdown();
  });
});
