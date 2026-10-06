/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { api } from '@elastic/opentelemetry-node/sdk';
import type { tracing } from '@elastic/opentelemetry-node/sdk';
import type { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
export declare abstract class BaseInferenceSpanProcessor implements tracing.SpanProcessor {
  private delegate;
  constructor(exporter: OTLPTraceExporter, scheduledDelayMillis: number);
  abstract processInferenceSpan(span: tracing.ReadableSpan): tracing.ReadableSpan;
  onStart(span: tracing.Span, parentContext: api.Context): void;
  onEnd(span: tracing.ReadableSpan): void;
  forceFlush(): Promise<void>;
  shutdown(): Promise<void>;
}
