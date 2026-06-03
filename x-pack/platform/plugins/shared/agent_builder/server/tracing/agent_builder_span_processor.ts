/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { api } from '@elastic/opentelemetry-node/sdk';
import { resources, tracing } from '@elastic/opentelemetry-node/sdk';
import { DATA_STREAM_NAMESPACE_ATTR, isAgentBuilderSpan } from './agent_builder_context';

const SHOULD_TRACK_ATTR = '_agent_builder_should_track';

interface AgentBuilderSpanProcessorOpts {
  exporter: tracing.SpanExporter;
  scheduledDelayMillis: number;
  isEnabled?: () => boolean;
}

/**
 * Span processor that exports Agent Builder inference spans.
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
    if (isAgentBuilderSpan(span, parentContext)) {
      span.setAttribute(SHOULD_TRACK_ATTR, true);
      this.batchProcessor.onStart(span, parentContext);
    }
  }

  onEnd(span: tracing.ReadableSpan): void {
    if (!span.attributes[SHOULD_TRACK_ATTR]) {
      return;
    }

    const {
      [SHOULD_TRACK_ATTR]: _,
      [DATA_STREAM_NAMESPACE_ATTR]: namespace,
      ...cleanAttributes
    } = span.attributes;

    const datasetResource = resources.resourceFromAttributes({
      'data_stream.dataset': 'agent_builder',
      ...(typeof namespace === 'string' ? { [DATA_STREAM_NAMESPACE_ATTR]: namespace } : {}),
    });

    const exportSpan: tracing.ReadableSpan = Object.create(span, {
      resource: {
        value: span.resource.merge(datasetResource),
        enumerable: true,
      },
      attributes: {
        value: cleanAttributes,
        enumerable: true,
      },
    });

    this.batchProcessor.onEnd(exportSpan);
  }

  forceFlush(): Promise<void> {
    return this.batchProcessor.forceFlush();
  }

  shutdown(): Promise<void> {
    return this.batchProcessor.shutdown();
  }
}
