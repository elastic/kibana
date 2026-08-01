/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY_OTEL_SIGNAL_COUNTS } from './detect_otel_instrumentation';
import { generateOtelQueries } from './generate_otel_queries';
import type { OtelSignal } from './types';

const signal = (over: Partial<OtelSignal>): OtelSignal => ({
  kind: 'span_name',
  language: 'TypeScript',
  file: 'src/a.ts',
  line: 1,
  ...over,
});

const generate = (signals: OtelSignal[], counts = EMPTY_OTEL_SIGNAL_COUNTS) =>
  generateOtelQueries({
    serviceName: 'checkout',
    repository: 'acme/repo',
    gitSha: 'abc',
    signals,
    signalCounts: counts,
    traceStreams: ['traces-generic.otel-default'],
    metricStreams: ['metrics-generic.otel-default'],
    logStreams: ['logs-generic.otel-default'],
  });

const esql = (signals: OtelSignal[]) =>
  generate(signals).queries.map(({ query }) => query.esql.query);

describe('generateOtelQueries', () => {
  it('maps error and exception tiers to the correct stream families', () => {
    const queries = esql([signal({ kind: 'error_status' }), signal({ kind: 'record_exception' })]);
    expect(queries).toContain(
      'FROM traces-generic.otel-default | WHERE status.code == "Error" | STATS c = COUNT(*) BY name'
    );
    expect(queries).toContain(
      'FROM logs-generic.otel-default | WHERE attributes.exception.type IS NOT NULL | STATS c = COUNT(*) BY attributes.exception.type'
    );
    expect(queries.find((query) => query.includes('exception.type'))).not.toContain('traces-');
  });

  it('generates span, event, and metric query shapes', () => {
    const queries = esql([
      signal({ kind: 'span_name', value: 'checkout' }),
      signal({ kind: 'event_name', value: 'charged' }),
      signal({ kind: 'metric_name', value: 'checkout.requests' }),
    ]);
    expect(queries).toEqual(
      expect.arrayContaining([
        expect.stringContaining('WHERE name == "checkout" | STATS total = COUNT(*)'),
        'FROM logs-generic.otel-default | WHERE event_name == "charged"',
        // metrics-* is TSDB: TS source + RATE() for a counter (default kind), never raw AVG()
        'TS metrics-generic.otel-default | WHERE `metrics.checkout.requests` IS NOT NULL | STATS rate = SUM(RATE(`metrics.checkout.requests`))',
      ])
    );
  });

  it.each([
    ['counter', 'STATS rate = SUM(RATE(`metrics.m`))'],
    ['histogram', 'STATS p95 = AVG(PERCENTILE_OVER_TIME(`metrics.m`, 95))'],
    ['gauge', 'STATS avg = AVG(AVG_OVER_TIME(`metrics.m`))'],
    ['updown', 'STATS avg = AVG(AVG_OVER_TIME(`metrics.m`))'],
  ] as const)('emits TSDB-correct aggregation for %s instruments', (metricKind, shape) => {
    const queries = esql([signal({ kind: 'metric_name', value: 'm', metricKind })]);
    expect(queries[0]).toBe(
      `TS metrics-generic.otel-default | WHERE \`metrics.m\` IS NOT NULL | ${shape}`
    );
  });

  it.each([
    ['bool', 'WHERE `attributes.app.amount` == false'],
    [
      'number',
      'STATS avg = AVG(`attributes.app.amount`), max = MAX(`attributes.app.amount`), p95 = PERCENTILE(`attributes.app.amount`, 95)',
    ],
    ['enum', 'STATS c = COUNT(*) BY `attributes.app.amount`'],
    ['id', 'STATS c = COUNT(*) BY `attributes.app.amount`'],
    ['unknown', 'STATS c = COUNT(*) BY `attributes.app.amount`'],
  ] as const)('maps %s attribute hints to traces', (valueHint, shape) => {
    const queries = esql([signal({ kind: 'attr_key', value: 'app.amount', valueHint })]);
    expect(queries[0]).toContain('FROM traces-generic.otel-default');
    expect(queries[0]).toContain(shape);
  });

  it('quotes field identifiers containing special characters', () => {
    const queries = esql([
      signal({ kind: 'attr_key', value: 'app.feature-enabled', valueHint: 'bool' }),
      signal({ kind: 'metric_name', value: 'http server/duration' }),
    ]);
    expect(queries).toEqual(
      expect.arrayContaining([
        expect.stringContaining('`attributes.app.feature-enabled`'),
        expect.stringContaining('`metrics.http server/duration`'),
      ])
    );
  });

  it('does not generate queries for templated signals', () => {
    expect(generate([signal({ value: 'checkout', templated: true })])).toEqual({
      queries: [],
      gateBypassed: true,
    });
  });

  it('emits deterministic instrumentation queries only when an import was detected', () => {
    expect(generate([], { ...EMPTY_OTEL_SIGNAL_COUNTS, instrumentation_grpc: 1 }).queries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tier: 'instrumented_error_status' }),
        expect.objectContaining({ tier: 'grpc_failure' }),
      ])
    );
    expect(generate([])).toEqual({ queries: [], gateBypassed: true });
  });

  it('bypasses the gate when no tier has a usable stream', () => {
    const result = generateOtelQueries({
      serviceName: 'checkout',
      repository: 'acme/repo',
      gitSha: 'abc',
      signals: [signal({ kind: 'span_name', value: 'checkout' })],
      signalCounts: EMPTY_OTEL_SIGNAL_COUNTS,
      traceStreams: [],
      metricStreams: [],
      logStreams: [],
    });
    expect(result).toEqual({ queries: [], gateBypassed: true });
  });

  it('bypasses when the service has streams but none for its extracted tier', () => {
    const result = generateOtelQueries({
      serviceName: 'checkout',
      repository: 'acme/repo',
      gitSha: 'abc',
      signals: [signal({ kind: 'span_name', value: 'checkout' })],
      signalCounts: EMPTY_OTEL_SIGNAL_COUNTS,
      traceStreams: [],
      metricStreams: ['metrics-otel'],
      logStreams: ['logs-otel'],
    });
    expect(result).toEqual({ queries: [], gateBypassed: true });
  });
});
