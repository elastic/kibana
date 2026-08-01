/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractOtelSignalsFromWindows } from './extract_otel_signals';

const extract = (files: Record<string, string>) =>
  extractOtelSignalsFromWindows(
    Object.entries(files).map(([file, content]) => ({ file, line: 1, content }))
  );

describe('extractOtelSignals', () => {
  it('extracts cross-language span names', () => {
    const signals = extract({
      'src/a.ts': 'tracer.startSpan("ts.span")',
      'src/a.go': 'tracer.Start(ctx, "go.span")',
      'src/a.py': 'tracer.start_as_current_span("py.span")',
      'src/A.java': 'tracer.spanBuilder("java.span")',
      'src/A.cs': 'source.StartActivity("cs.span")',
    });
    expect(
      signals
        .filter(({ kind }) => kind === 'span_name')
        .map(({ value }) => value)
        .sort()
    ).toEqual(['cs.span', 'go.span', 'java.span', 'py.span', 'ts.span']);
  });

  it('extracts object attributes, non-app namespaces, and templated prefixes', () => {
    const signals = extract({
      'src/a.ts': [
        'span.setAttributes({ "payment.valid": false, "payment.amount": 42, "http.method": method });',
        'span.addEvent(`checkout.${type}`);',
      ].join('\n'),
    });
    expect(signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'attr_key', value: 'payment.valid', valueHint: 'bool' }),
        expect.objectContaining({ kind: 'attr_key', value: 'payment.amount', valueHint: 'number' }),
        expect.objectContaining({ kind: 'event_name', value: 'checkout', templated: true }),
      ])
    );
    expect(signals).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ value: 'http.method' })])
    );
  });

  it('extracts error and metric signals and excludes test paths', () => {
    const signals = extract({
      'src/a.ts': [
        'meter.createCounter("checkout.requests")',
        'span.setStatus({ code: SpanStatusCode.ERROR })',
        'span.recordException(error)',
      ].join('\n'),
      'src/__tests__/a.ts': 'tracer.startSpan("test")',
      'src/a_test.go': 'tracer.Start(ctx, "test-go")',
    });
    expect(signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'metric_name', value: 'checkout.requests' }),
        expect.objectContaining({ kind: 'error_status' }),
        expect.objectContaining({ kind: 'record_exception' }),
      ])
    );
    expect(signals.some(({ value }) => value?.startsWith('test'))).toBe(false);
  });
});
