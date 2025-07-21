/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { api, tracing } from '@elastic/opentelemetry-node/sdk';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { isInInferenceContext } from './is_in_inference_context';
import { IS_ROOT_INFERENCE_SPAN_ATTRIBUTE_NAME } from './root_inference_span';

export abstract class BaseInferenceSpanProcessor implements tracing.SpanProcessor {
  private delegate: tracing.SpanProcessor;

  constructor(exporter: OTLPTraceExporter, scheduledDelayMillis: number) {
    this.delegate = new tracing.BatchSpanProcessor(exporter, {
      scheduledDelayMillis,
    });
  }

  abstract processInferenceSpan(span: tracing.ReadableSpan): tracing.ReadableSpan;

  onStart(span: tracing.Span, parentContext: api.Context): void {
    const shouldTrack =
      (isInInferenceContext(parentContext) || span.instrumentationScope.name === 'inference') &&
      span.instrumentationScope.name !== '@elastic/transport';

    if (shouldTrack) {
      span.setAttribute('_should_track', true);
      this.delegate.onStart(span, parentContext);
    }
  }

  onEnd(span: tracing.ReadableSpan): void {
    if (span.attributes._should_track) {
      delete span.attributes._should_track;

      // if this is the "root" inference span, but has a parent,
      // drop the parent context and Langfuse only shows root spans
      if (span.attributes[IS_ROOT_INFERENCE_SPAN_ATTRIBUTE_NAME] && span.parentSpanContext) {
        span = {
          ...span,
          spanContext: span.spanContext.bind(span),
          parentSpanContext: undefined,
        };
      }

      delete span.attributes[IS_ROOT_INFERENCE_SPAN_ATTRIBUTE_NAME];

      span = this.processInferenceSpan(span);
      this.delegate.onEnd(span);
    }
  }

  forceFlush(): Promise<void> {
    return this.delegate.forceFlush();
  }

  shutdown(): Promise<void> {
    return this.delegate.shutdown();
  }
}
