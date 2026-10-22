/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resources, tracing } from '@elastic/opentelemetry-node/sdk';
import {
  EVALUATION_EVENTS_DATA_STREAM_NAMESPACE_ATTRIBUTE,
  EvaluationEventsResourceProcessor,
} from './evaluation_events_resource_processor';

describe('EvaluationEventsResourceProcessor', () => {
  it('moves the namespace to the evals resource and removes the routing attribute', async () => {
    const exporter = new tracing.InMemorySpanExporter();
    const provider = new tracing.BasicTracerProvider({
      resource: resources.resourceFromAttributes({ 'service.name': 'kibana' }),
      spanProcessors: [
        new EvaluationEventsResourceProcessor(new tracing.SimpleSpanProcessor(exporter)),
      ],
    });
    const span = provider.getTracer('test').startSpan('evaluation');
    span.setAttribute(EVALUATION_EVENTS_DATA_STREAM_NAMESPACE_ATTRIBUTE, 'space-a');
    span.setAttribute('kept.attribute', 'kept');
    span.end();

    await provider.forceFlush();

    const [exportedSpan] = exporter.getFinishedSpans();
    expect(exportedSpan.resource.attributes).toEqual(
      expect.objectContaining({
        'service.name': 'kibana',
        'data_stream.dataset': 'evals',
        'data_stream.namespace': 'space-a',
      })
    );
    expect(exportedSpan.attributes).toEqual({ 'kept.attribute': 'kept' });

    await provider.shutdown();
  });
});
