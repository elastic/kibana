/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Context } from '@opentelemetry/api';
import type { tracing } from '@elastic/opentelemetry-node/sdk';

/**
 * Forwards inference provider spans to the global LateBindingSpanProcessor,
 * so they flow to Langfuse, Phoenix, and OTLP exporters configured globally.
 */
export class GlobalBridgeProcessor implements tracing.SpanProcessor {
  constructor(private readonly globalProcessor: tracing.SpanProcessor) {}

  onStart(span: tracing.Span, parentContext: Context): void {
    this.globalProcessor.onStart(span, parentContext);
  }

  onEnd(span: tracing.ReadableSpan): void {
    this.globalProcessor.onEnd(span);
  }

  async forceFlush(): Promise<void> {
    await this.globalProcessor.forceFlush();
  }

  async shutdown(): Promise<void> {
    // Don't shut down the global processor -- it's owned by the global provider
  }
}
