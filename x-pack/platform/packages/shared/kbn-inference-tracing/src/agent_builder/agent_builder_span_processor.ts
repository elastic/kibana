/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { api } from '@elastic/opentelemetry-node/sdk';
import { tracing } from '@elastic/opentelemetry-node/sdk';
import type { InferenceTracingAgentBuilderExportConfig } from '@kbn/inference-tracing-config';
import { TraceFlags } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { isInInferenceContext } from '../is_in_inference_context';

const SHOULD_TRACK_ATTR = '_ab_should_track';

/**
 * Span processor that exports inference spans to Elasticsearch via OTLP.
 *
 * Unlike BaseInferenceSpanProcessor (used by Phoenix/Langfuse), this processor
 * forces the SAMPLED trace flag on the span copy before passing it to
 * BatchSpanProcessor.onEnd. This is necessary because the AgentBuilderSampler
 * upgrades dropped inference spans to RECORD (not RECORD_AND_SAMPLED), so
 * BatchSpanProcessor would otherwise skip them. By setting the flag on a copy,
 * we ensure export without affecting the original span or other processors.
 */
export class AgentBuilderSpanProcessor implements tracing.SpanProcessor {
  private readonly batchProcessor: tracing.SpanProcessor;

  constructor(config: InferenceTracingAgentBuilderExportConfig) {
    const exporter = new OTLPTraceExporter({
      url: config.url,
      ...(config.headers ? { headers: config.headers } : {}),
    });

    this.batchProcessor = new tracing.BatchSpanProcessor(exporter, {
      scheduledDelayMillis: config.scheduled_delay,
    });
  }

  onStart(span: tracing.Span, parentContext: api.Context): void {
    const shouldTrack =
      (isInInferenceContext(parentContext) || span.instrumentationScope.name === 'inference') &&
      span.instrumentationScope.name !== '@elastic/transport';

    if (shouldTrack) {
      span.setAttribute(SHOULD_TRACK_ATTR, true);
      this.batchProcessor.onStart(span, parentContext);
    }
  }

  onEnd(span: tracing.ReadableSpan): void {
    if (!span.attributes[SHOULD_TRACK_ATTR]) {
      return;
    }

    const { [SHOULD_TRACK_ATTR]: _, ...cleanAttributes } = span.attributes;
    const originalSpanContext = span.spanContext();

    const exportSpan: tracing.ReadableSpan = {
      ...span,
      spanContext: () => ({
        ...originalSpanContext,
        traceFlags: TraceFlags.SAMPLED,
      }),
      attributes: {
        ...cleanAttributes,
        'data_stream.dataset': 'agent_builder',
      },
    };

    this.batchProcessor.onEnd(exportSpan);
  }

  forceFlush(): Promise<void> {
    return this.batchProcessor.forceFlush();
  }

  shutdown(): Promise<void> {
    return this.batchProcessor.shutdown();
  }
}
