/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resources } from '@elastic/opentelemetry-node/sdk';
import type { api, tracing } from '@elastic/opentelemetry-node/sdk';
import { EVALS_EVENTS_DATASET } from '@kbn/evals-common';

export const EVALUATION_EVENTS_DATA_STREAM_NAMESPACE_ATTRIBUTE = 'data_stream.namespace';

export class EvaluationEventsResourceProcessor implements tracing.SpanProcessor {
  constructor(private readonly processor: tracing.SpanProcessor) {}

  onStart(span: tracing.Span, parentContext: api.Context): void {
    this.processor.onStart(span, parentContext);
  }

  onEnd(span: tracing.ReadableSpan): void {
    const { [EVALUATION_EVENTS_DATA_STREAM_NAMESPACE_ATTRIBUTE]: namespace, ...attributes } =
      span.attributes;
    const datasetResource = resources.resourceFromAttributes({
      'data_stream.dataset': EVALS_EVENTS_DATASET,
      ...(typeof namespace === 'string'
        ? { [EVALUATION_EVENTS_DATA_STREAM_NAMESPACE_ATTRIBUTE]: namespace }
        : {}),
    });
    const exportSpan: tracing.ReadableSpan = Object.create(span, {
      resource: {
        value: span.resource.merge(datasetResource),
        enumerable: true,
      },
      attributes: {
        value: attributes,
        enumerable: true,
      },
    });

    this.processor.onEnd(exportSpan);
  }

  forceFlush(): Promise<void> {
    return this.processor.forceFlush();
  }

  shutdown(): Promise<void> {
    return this.processor.shutdown();
  }
}
