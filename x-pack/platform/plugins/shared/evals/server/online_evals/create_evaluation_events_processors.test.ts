/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tracing } from '@elastic/opentelemetry-node/sdk';
import type { ElasticsearchClient } from '@kbn/core/server';
import { createEvaluationEventsProcessors } from './create_evaluation_events_processors';

const esClient = {} as ElasticsearchClient;

describe('createEvaluationEventsProcessors', () => {
  it('exports to Elasticsearch when no OTLP endpoints are configured', () => {
    const processors = createEvaluationEventsProcessors({ exporters: [], esClient });

    expect(processors).toHaveLength(1);
    expect(processors[0]).toBeInstanceOf(tracing.SimpleSpanProcessor);
  });

  it('adds one processor per configured OTLP endpoint alongside Elasticsearch', () => {
    const processors = createEvaluationEventsProcessors({
      exporters: [
        { url: 'http://localhost:4318/v1/traces' },
        { url: 'https://collector.example:4318/v1/traces', headers: { Authorization: 'x' } },
      ],
      esClient,
    });

    expect(processors).toHaveLength(3);
    expect(processors.every((processor) => processor instanceof tracing.SimpleSpanProcessor)).toBe(
      true
    );
  });
});
