/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { api } from '@elastic/opentelemetry-node/sdk';
import { tracing } from '@elastic/opentelemetry-node/sdk';
import { propagation } from '@opentelemetry/api';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { ElasticsearchSpanExporter } from './elasticsearch_span_exporter';

const SHOULD_TRACK_ATTR = '_es_should_track';
const BAGGAGE_TRACKING_BEACON_KEY = 'kibana.inference.tracing';
const BAGGAGE_TRACKING_BEACON_VALUE = '1';

function isInInferenceContext(context: api.Context): boolean {
  const baggage = propagation.getBaggage(context);
  return baggage?.getEntry(BAGGAGE_TRACKING_BEACON_KEY)?.value === BAGGAGE_TRACKING_BEACON_VALUE;
}

export interface ElasticsearchSpanProcessorConfig {
  scheduledDelayMillis: number;
}

export class ElasticsearchInferenceSpanProcessor implements tracing.SpanProcessor {
  private delegate: tracing.SpanProcessor;
  private exporter: ElasticsearchSpanExporter;

  constructor(
    esClient: ElasticsearchClient,
    logger: Logger,
    config: ElasticsearchSpanProcessorConfig
  ) {
    this.exporter = new ElasticsearchSpanExporter(esClient, logger);
    this.delegate = new tracing.BatchSpanProcessor(this.exporter, {
      scheduledDelayMillis: config.scheduledDelayMillis,
    });
  }

  onStart(span: tracing.Span, parentContext: api.Context): void {
    const shouldTrack =
      (isInInferenceContext(parentContext) || span.instrumentationScope.name === 'inference') &&
      span.instrumentationScope.name !== '@elastic/transport';

    if (shouldTrack) {
      span.setAttribute(SHOULD_TRACK_ATTR, true);
      this.delegate.onStart(span, parentContext);
    }
  }

  onEnd(span: tracing.ReadableSpan): void {
    if (!span.attributes[SHOULD_TRACK_ATTR]) {
      return;
    }

    const { [SHOULD_TRACK_ATTR]: _, ...attributesToCapture } = span.attributes;

    this.delegate.onEnd({
      ...span,
      spanContext: span.spanContext.bind(span),
      attributes: attributesToCapture,
    });
  }

  forceFlush(): Promise<void> {
    return this.delegate.forceFlush();
  }

  shutdown(): Promise<void> {
    return this.delegate.shutdown();
  }
}
