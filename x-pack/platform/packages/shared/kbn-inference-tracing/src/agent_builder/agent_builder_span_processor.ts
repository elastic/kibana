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
import { shouldTrackSpan } from '../should_track_span';

const SHOULD_TRACK_ATTR = '_agent_builder_should_track';

interface AgentBuilderSpanProcessorOpts {
  exporter: tracing.SpanExporter;
  scheduledDelayMillis: number;
}

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

  constructor(
    optsOrConfig: AgentBuilderSpanProcessorOpts | InferenceTracingAgentBuilderExportConfig
  ) {
    if ('exporter' in optsOrConfig) {
      this.batchProcessor = new tracing.BatchSpanProcessor(optsOrConfig.exporter, {
        scheduledDelayMillis: optsOrConfig.scheduledDelayMillis,
      });
    } else {
      if (!optsOrConfig.url) {
        throw new Error(
          'AgentBuilderSpanProcessor requires "url" when not using a custom exporter'
        );
      }
      const exporter = new OTLPTraceExporter({
        url: optsOrConfig.url,
        ...(optsOrConfig.headers ? { headers: optsOrConfig.headers } : {}),
      });
      this.batchProcessor = new tracing.BatchSpanProcessor(exporter, {
        scheduledDelayMillis: optsOrConfig.scheduled_delay,
      });
    }
  }

  onStart(span: tracing.Span, parentContext: api.Context): void {
    if (shouldTrackSpan(span, parentContext)) {
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
      // AgentBuilderSampler upgrades dropped inference spans to RECORD (not RECORD_AND_SAMPLED),
      // so BatchSpanProcessor.onEnd skips them. Force SAMPLED on the copy to ensure 100% sample
      // rate for agent builder traces, without affecting the original span or other processors.
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
