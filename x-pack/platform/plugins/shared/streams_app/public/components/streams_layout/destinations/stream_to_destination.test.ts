/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ClassicStreamDetail, StreamListItem } from './stream_to_destination';
import { isDestinationStream, streamToDestination } from './stream_to_destination';

const classicDetail = {
  stream: {
    name: 'logs-nginx-default',
    description: '',
    updated_at: '2026-01-01T00:00:00.000Z',
    ingest: {
      lifecycle: { inherit: {} },
      processing: { steps: [], updated_at: '2026-01-01T00:00:00.000Z' },
      settings: {},
      failure_store: { inherit: {} },
      classic: { field_overrides: {} },
    },
  },
  effective_lifecycle: { dsl: { data_retention: '30d' } },
  data_stream: { name: 'logs-nginx-default', index_mode: 'logsdb' },
  privileges: { read_failure_store: true },
} as unknown as ClassicStreamDetail;

const queryDetail = {
  stream: {
    name: 'my-query-stream',
    description: '',
    updated_at: '2026-01-01T00:00:00.000Z',
    type: 'query',
    query: { view: 'my-view', esql: 'FROM logs' },
  },
  privileges: { read_failure_store: false },
} as unknown as StreamListItem;

const wiredDetail = {
  stream: {
    name: 'logs.nginx',
    description: '',
    updated_at: '2026-01-01T00:00:00.000Z',
    ingest: {
      lifecycle: { inherit: {} },
      processing: { steps: [], updated_at: '2026-01-01T00:00:00.000Z' },
      settings: {},
      failure_store: { inherit: {} },
      wired: { fields: {}, routing: [] },
    },
  },
  effective_lifecycle: { dsl: { data_retention: '7d' } },
  privileges: { read_failure_store: false },
} as unknown as StreamListItem;

describe('isDestinationStream', () => {
  it('treats classic streams as destinations', () => {
    expect(isDestinationStream(classicDetail)).toBe(true);
  });

  it('excludes wired streams for now, mirroring the canvas', () => {
    expect(isDestinationStream(wiredDetail)).toBe(false);
  });

  it('excludes query streams', () => {
    expect(isDestinationStream(queryDetail)).toBe(false);
  });
});

describe('streamToDestination', () => {
  it('maps stream fields to the destination view model', () => {
    const destination = streamToDestination(classicDetail);

    expect(destination.name).toBe('logs-nginx-default');
    expect(destination.type).toBe('elasticsearch');
    expect(destination.hasDataStream).toBe(true);
    expect(destination.canReadFailureStore).toBe(true);
    expect(destination.retention).toEqual({ dsl: { data_retention: '30d' } });
    expect(destination.streamDefinition).toBe(classicDetail.stream);
    expect(destination.indexMode).toBe('logsdb');
  });

  it('defaults the index mode when there is no data stream', () => {
    const destination = streamToDestination({
      ...classicDetail,
      data_stream: undefined,
    } as unknown as ClassicStreamDetail);

    expect(destination.indexMode).toBe('standard');
    expect(destination.hasDataStream).toBe(false);
  });

  it('computes the sortable retention from a DSL lifecycle', () => {
    const destination = streamToDestination(classicDetail);

    expect(destination.retentionMs).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('treats a DSL lifecycle without data_retention as indefinite', () => {
    const destination = streamToDestination({
      ...classicDetail,
      effective_lifecycle: { dsl: {} },
    } as unknown as ClassicStreamDetail);

    expect(destination.retentionMs).toBe(Number.POSITIVE_INFINITY);
  });

  it('does not treat an ILM lifecycle as indefinite', () => {
    const destination = streamToDestination({
      ...classicDetail,
      effective_lifecycle: { ilm: { policy: 'my-policy' } },
    } as unknown as ClassicStreamDetail);

    expect(destination.retentionMs).toBeUndefined();
    expect(destination.retention).toEqual({ ilm: { policy: 'my-policy' } });
  });

  it('fills design-only fields with deterministic mock metadata', () => {
    const first = streamToDestination(classicDetail);
    const second = streamToDestination(classicDetail);

    expect(first.tags.length).toBeGreaterThanOrEqual(1);
    expect(first).toEqual(second);
  });
});
