/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeState } from '@kbn/es-query';
import type { Streams } from '@kbn/streams-schema';
import type { Condition } from '@kbn/streamlang';
import { buildFeatureDiscoverParams } from './discover_helpers';

const timeState = {
  timeRange: { from: 'now-15m', to: 'now' },
} as TimeState;

const filter: Condition = { field: 'log.level', eq: 'error' };

const classicStream: Streams.ClassicStream.Definition = {
  type: 'classic',
  name: 'logs-myapp',
  description: '',
  updated_at: '2025-01-01T00:00:00.000Z',
  ingest: {
    lifecycle: { dsl: {} },
    processing: { steps: [], updated_at: '2025-01-01T00:00:00.000Z' },
    settings: {},
    failure_store: { lifecycle: { enabled: { data_retention: '30d' } } },
    classic: {},
  },
};

const wiredStream: Streams.WiredStream.Definition = {
  type: 'wired',
  name: 'logs.otel',
  description: '',
  updated_at: '2025-01-01T00:00:00.000Z',
  ingest: {
    lifecycle: { dsl: {} },
    processing: { steps: [], updated_at: '2025-01-01T00:00:00.000Z' },
    settings: {},
    wired: { fields: {}, routing: [] },
    failure_store: { lifecycle: { enabled: { data_retention: '30d' } } },
  },
};

const queryStream: Streams.QueryStream.Definition = {
  type: 'query',
  name: 'logs.otel.nginx.errors',
  description: '',
  updated_at: '2025-01-01T00:00:00.000Z',
  query: {
    esql: 'FROM logs.otel.nginx | WHERE log.level == "error"',
    view: '$.logs.otel.nginx.errors',
  },
};

describe('buildFeatureDiscoverParams', () => {
  it('forwards the time range and requests unmapped fields', () => {
    const params = buildFeatureDiscoverParams(classicStream, filter, timeState);

    expect(params.timeRange).toEqual({ from: 'now-15m', to: 'now' });
    expect(params.interval).toBe('auto');
    expect(params.query.esql).toContain('unmapped_fields');
    expect(params.query.esql).toContain('WHERE');
  });

  it('queries the stream name for classic streams', () => {
    const { query } = buildFeatureDiscoverParams(classicStream, filter, timeState);

    expect(query.esql).toContain('FROM logs-myapp');
    expect(query.esql).not.toContain('logs-myapp.*');
  });

  it('expands to child data streams for wired streams', () => {
    const { query } = buildFeatureDiscoverParams(wiredStream, filter, timeState);

    expect(query.esql).toContain('FROM logs.otel, logs.otel.*');
  });

  it('queries the ES|QL view for query streams', () => {
    const { query } = buildFeatureDiscoverParams(queryStream, filter, timeState);

    expect(query.esql).toContain('$.logs.otel.nginx.errors');
    expect(query.esql).not.toContain('FROM logs.otel.nginx.errors');
  });
});
