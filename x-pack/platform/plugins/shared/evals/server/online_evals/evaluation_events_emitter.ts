/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { node, tracing } from '@elastic/opentelemetry-node/sdk';
import {
  EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS,
  GEN_AI_EVALUATION_RESULT_EVENT,
  type EvaluateResult,
} from '@kbn/evals-common';
import { ROOT_CONTEXT, SpanKind, TraceFlags, trace } from '@opentelemetry/api';
import { toEvaluationEventAttributes } from './evaluation_event_attributes';
import {
  EVALUATION_EVENTS_DATA_STREAM_NAMESPACE_ATTRIBUTE,
  EvaluationEventsResourceProcessor,
} from './evaluation_events_resource_processor';

interface EmitEvaluationEventsOptions {
  spaceId: string;
  monitor: {
    id: string;
    name: string;
  };
  traceId: string;
  spanId: string;
  /** Connector each LLM evaluator ran with, keyed by evaluator name. */
  connectorIdByEvaluator?: ReadonlyMap<string, string>;
  results: EvaluateResult[];
}

export class EvaluationEventsEmitter {
  private readonly provider: node.NodeTracerProvider;
  private readonly tracer: ReturnType<node.NodeTracerProvider['getTracer']>;

  /** Each processor receives the evaluation span with the `evals` data stream resource. */
  constructor(...processors: tracing.SpanProcessor[]) {
    this.provider = new node.NodeTracerProvider({
      sampler: new tracing.AlwaysOnSampler(),
      spanProcessors: processors.map(
        (processor) => new EvaluationEventsResourceProcessor(processor)
      ),
    });
    this.tracer = this.provider.getTracer('@kbn/evals.online');
  }

  async emit({
    spaceId,
    monitor,
    traceId,
    spanId,
    connectorIdByEvaluator,
    results,
  }: EmitEvaluationEventsOptions): Promise<{ emitted: number }> {
    const parentContext = trace.setSpanContext(ROOT_CONTEXT, {
      traceId,
      spanId,
      traceFlags: TraceFlags.SAMPLED,
      isRemote: true,
    });
    const span = this.tracer.startSpan(
      'evals.online_evaluation',
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          [EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.MONITOR_ID]: monitor.id,
          [EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.MONITOR_NAME]: monitor.name,
          [EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.SPACE_ID]: spaceId,
          [EVALUATION_EVENTS_DATA_STREAM_NAMESPACE_ATTRIBUTE]: spaceId,
        },
      },
      parentContext
    );

    let emitted = 0;
    for (const result of results) {
      if (result.status !== 'ok') {
        continue;
      }
      const connectorId = connectorIdByEvaluator?.get(result.evaluator.name);
      for (const score of result.scores ?? []) {
        span.addEvent(
          GEN_AI_EVALUATION_RESULT_EVENT,
          toEvaluationEventAttributes({ monitor, spaceId, connectorId, result, score })
        );
        emitted += 1;
      }
    }

    span.end();
    await this.provider.forceFlush();

    return { emitted };
  }

  shutdown(): Promise<void> {
    return this.provider.shutdown();
  }
}
