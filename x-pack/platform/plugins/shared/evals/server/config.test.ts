/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configSchema } from './config';

describe('evals config schema', () => {
  it('defaults the online eval result sink to the data stream', () => {
    expect(configSchema.validate({}).onlineEvals.resultSink).toBe('data_stream');
  });

  it('accepts the OTel events result sink', () => {
    expect(
      configSchema.validate({ onlineEvals: { resultSink: 'otel_events' } }).onlineEvals.resultSink
    ).toBe('otel_events');
  });

  it('defaults to no OTLP exporters for evaluation events', () => {
    expect(configSchema.validate({}).onlineEvals.exporters).toEqual([]);
  });

  it('accepts OTLP exporters with optional headers', () => {
    const exporters = [
      { url: 'http://localhost:4318/v1/traces' },
      { url: 'https://collector.example:4318/v1/traces', headers: { Authorization: 'ApiKey x' } },
    ];

    expect(configSchema.validate({ onlineEvals: { exporters } }).onlineEvals.exporters).toEqual(
      exporters
    );
  });

  it('rejects non-http exporter URLs', () => {
    expect(() =>
      configSchema.validate({ onlineEvals: { exporters: [{ url: 'ftp://localhost/v1/traces' }] } })
    ).toThrow();
  });
});
