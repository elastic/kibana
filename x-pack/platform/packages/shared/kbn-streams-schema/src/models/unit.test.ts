/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  collectUnitComponentIds,
  findDuplicateUnitComponentIds,
  streamsUnitSchema,
  streamsUnitSecretsSchema,
  streamsUnitStatsRequestSchema,
  streamsUnitStatsResponseSchema,
  streamsUnitUpsertRequestSchema,
  type StreamsUnit,
} from './unit';

const validUnit: StreamsUnit.Configuration = {
  sources: [
    {
      id: 'otlp-input',
      type: 'nop',
      supported_telemetry: ['logs'],
    },
  ],
  processors: [
    {
      id: 'add-env',
      type: 'add_fields',
      supported_telemetry: ['logs'],
    },
  ],
  destinations: [
    {
      id: 'es-prod',
      type: 'debug',
      supported_telemetry: ['logs'],
    },
  ],
  pipelines: [
    {
      id: 'main',
      supported_telemetry: ['logs'],
      config: [
        { name: 'sources', value: ['otlp-input'] },
        { name: 'processors', value: ['add-env'] },
        { name: 'destinations', value: ['es-prod'] },
      ],
    },
  ],
};

describe('streams unit schema', () => {
  it('defaults omitted sources, destinations, and pipelines to empty arrays', () => {
    expect(streamsUnitSchema.parse({ sources: validUnit.sources })).toEqual({
      sources: validUnit.sources,
      destinations: [],
      pipelines: [],
    });
  });

  it('rejects invalid component identifiers', () => {
    expect(() =>
      streamsUnitSchema.parse({
        ...validUnit,
        sources: [
          {
            id: '_default_',
            type: 'nop',
            supported_telemetry: ['logs'],
          },
        ],
      })
    ).toThrow();
  });

  it('collects ids across component kinds', () => {
    expect(collectUnitComponentIds(validUnit).sort()).toEqual(
      ['add-env', 'es-prod', 'main', 'otlp-input'].sort()
    );
  });

  it('accepts an omitted secrets bag on upsert and rejects oversized maps', () => {
    expect(
      streamsUnitUpsertRequestSchema.parse({
        unit: { sources: validUnit.sources },
        ui_metadata: {},
      }).secrets
    ).toBeUndefined();
    expect(streamsUnitSecretsSchema.parse({ 'es-prod': 's3cret' })).toEqual({
      'es-prod': 's3cret',
    });
    expect(() => streamsUnitSecretsSchema.parse({ es_api_key: 's3cret' })).toThrow();
    expect(() =>
      streamsUnitSecretsSchema.parse(
        Object.fromEntries(Array.from({ length: 501 }, (_, i) => [`k${i}`, 'v']))
      )
    ).toThrow();
  });

  it('finds duplicate ids across component kinds', () => {
    expect(
      findDuplicateUnitComponentIds({
        ...validUnit,
        processors: [
          {
            id: 'otlp-input',
            type: 'add_fields',
            supported_telemetry: ['logs'],
          },
        ],
      })
    ).toEqual(['otlp-input']);
  });
});

describe('streams unit stats request schema', () => {
  const timeRange = { start: '2026-10-16T12:00:00.000Z', end: '2026-10-16T12:15:00.000Z' };

  it('accepts up to 100 components and rejects more', () => {
    const components = (count: number) =>
      Array.from({ length: count }, (_, index) => ({ kind: 'destination', id: `d-${index}` }));

    expect(streamsUnitStatsRequestSchema.safeParse({ components: components(100) }).success).toBe(
      true
    );
    expect(streamsUnitStatsRequestSchema.safeParse({ components: components(101) }).success).toBe(
      false
    );
  });

  it('treats an empty request and an empty components list as valid', () => {
    expect(streamsUnitStatsRequestSchema.safeParse({}).success).toBe(true);
    expect(streamsUnitStatsRequestSchema.safeParse({ components: [] }).success).toBe(true);
  });

  it('accepts destination and processor components and rejects other kinds', () => {
    expect(
      streamsUnitStatsRequestSchema.safeParse({
        components: [
          { kind: 'destination', id: 'es-prod' },
          { kind: 'processor', id: 'add-env' },
        ],
      }).success
    ).toBe(true);
    expect(
      streamsUnitStatsRequestSchema.safeParse({ components: [{ kind: 'source', id: 'a' }] }).success
    ).toBe(false);
    expect(
      streamsUnitStatsRequestSchema.safeParse({ components: [{ kind: 'step', id: 'a' }] }).success
    ).toBe(false);
  });

  it('bounds config_hash to 1-128 characters', () => {
    const parse = (config_hash: string) =>
      streamsUnitStatsRequestSchema.safeParse({ filter: { config_hash } }).success;

    expect(parse('a'.repeat(64))).toBe(true);
    expect(parse('')).toBe(false);
    expect(parse('a'.repeat(129))).toBe(false);
  });

  it('accepts a time range of ISO 8601 UTC timestamps with milliseconds', () => {
    expect(
      streamsUnitStatsRequestSchema.safeParse({ filter: { time_range: timeRange } }).success
    ).toBe(true);
  });

  it('accepts a time range of 366 days and rejects a longer one', () => {
    const parse = (days: number) =>
      streamsUnitStatsRequestSchema.safeParse({
        filter: {
          time_range: {
            start: '2026-01-01T00:00:00.000Z',
            end: new Date(Date.parse('2026-01-01T00:00:00.000Z') + days * 86_400_000).toISOString(),
          },
        },
      }).success;

    expect(parse(366)).toBe(true);
    expect(parse(367)).toBe(false);
  });

  it('rejects a time range that is partial, not ISO 8601, or not start before end', () => {
    const parse = (time_range: object) =>
      streamsUnitStatsRequestSchema.safeParse({ filter: { time_range } }).success;

    expect(parse({ start: timeRange.start })).toBe(false);
    expect(parse({ end: timeRange.end })).toBe(false);
    expect(parse({ start: 'now-15m', end: 'now' })).toBe(false);
    expect(parse({ start: timeRange.start, end: timeRange.start })).toBe(false);
    expect(parse({ start: timeRange.end, end: timeRange.start })).toBe(false);
  });
});

describe('streams unit stats response schema', () => {
  const noDataDestination = {
    latency: { average: { value: null, unit: 's' } },
    events: {
      incoming: {
        total: { value: null, unit: '{item}' },
        rate: { value: null, unit: '{item}', time_unit: 's' },
        series: { bucket_ms: 10000, points: [] },
        failures: { rate: { value: null, unit: '{item}', time_unit: 's' } },
      },
    },
  };
  const meta = { window: { start: '2026-10-16T12:00:00.000Z', end: '2026-10-16T12:15:00.000Z' } };

  it('parses null values, empty series points and empty component maps', () => {
    expect(
      streamsUnitStatsResponseSchema.safeParse({
        components: { destinations: { 'es-prod': noDataDestination }, processors: {} },
        meta,
      }).success
    ).toBe(true);
    expect(
      streamsUnitStatsResponseSchema.safeParse({
        components: { destinations: {}, processors: {} },
        meta,
      }).success
    ).toBe(true);
  });

  it('parses a component-level error and a response-level error with an unknown code', () => {
    expect(
      streamsUnitStatsResponseSchema.safeParse({
        error: { code: 'some_future_code', reason: 'The stats stream is unreadable.' },
        components: {
          destinations: {
            'es-prod': {
              ...noDataDestination,
              error: { code: 'not_found', reason: 'Not in unit.' },
            },
          },
          processors: {},
        },
        meta,
      }).success
    ).toBe(true);
  });
});
