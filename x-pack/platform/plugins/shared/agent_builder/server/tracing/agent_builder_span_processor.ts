/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { api } from '@elastic/opentelemetry-node/sdk';
import { resources, tracing } from '@elastic/opentelemetry-node/sdk';
import { TraceFlags } from '@opentelemetry/api';
import { isInferenceSpan } from '@kbn/inference-tracing';

const SHOULD_TRACK_ATTR = '_agent_builder_should_track';

const AGENT_BUILDER_DATASET_RESOURCE = resources.resourceFromAttributes({
  'data_stream.dataset': 'agent_builder',
});

interface AgentBuilderSpanProcessorOpts {
  exporter: tracing.SpanExporter;
  scheduledDelayMillis: number;
  isEnabled?: () => boolean;
}

/**
 * Span processor that exports Agent Builder inference spans.
 *
 * This processor forces the SAMPLED trace flag on the span copy before
 * passing it to BatchSpanProcessor.onEnd. This is necessary because
 * InferencePreservingSampler upgrades dropped inference spans to RECORD
 * (not RECORD_AND_SAMPLED), so BatchSpanProcessor would otherwise skip
 * them. By setting the flag on a copy, we ensure export without affecting
 * the original span or other processors.
 */
export class AgentBuilderSpanProcessor implements tracing.SpanProcessor {
  private readonly batchProcessor: tracing.SpanProcessor;
  private readonly isEnabled: () => boolean;

  constructor(opts: AgentBuilderSpanProcessorOpts) {
    this.batchProcessor = new tracing.BatchSpanProcessor(opts.exporter, {
      scheduledDelayMillis: opts.scheduledDelayMillis,
    });
    this.isEnabled = opts.isEnabled ?? (() => true);
  }

  async onStart(span: tracing.Span, parentContext: api.Context): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }
    if (isInferenceSpan(span, parentContext)) {
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
      resource: span.resource.merge(AGENT_BUILDER_DATASET_RESOURCE),
      spanContext: () => ({
        ...originalSpanContext,
        traceFlags: TraceFlags.SAMPLED, // force 100% sampling
      }),
      attributes: cleanAttributes,
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
