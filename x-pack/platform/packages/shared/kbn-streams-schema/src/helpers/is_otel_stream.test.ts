/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isOtelStream } from './is_otel_stream';

describe('isOtelStream', () => {
  it('returns true for a wired stream', () => {
    const now = new Date().toISOString();

    const wired = {
      name: 'logs',
      description: '',
      updated_at: now,
      ingest: {
        lifecycle: { inherit: {} },
        failure_store: { inherit: {} },
        processing: { steps: [], updated_at: now },
        settings: {},
        wired: { fields: {}, routing: [] },
      },
    };
    expect(isOtelStream(wired)).toBe(true);
  });

  it('returns true for a non-wired classic stream matching otel pattern', () => {
    const now = new Date().toISOString();

    const classicOtelPattern = {
      name: 'logs-foo.bar.otel-baz',
      description: '',
      updated_at: now,
      ingest: {
        lifecycle: { inherit: {} },
        failure_store: { inherit: {} },
        processing: { steps: [], updated_at: now },
        settings: {},
        classic: {},
      },
    };
    expect(isOtelStream(classicOtelPattern)).toBe(true);
  });

  it('returns false for a classic stream not matching otel pattern', () => {
    const now = new Date().toISOString();

    const classicNonOtel = {
      name: 'logs-foo-bar-baz', // missing .otel- sequence
      description: '',
      updated_at: now,
      ingest: {
        lifecycle: { inherit: {} },
        failure_store: { inherit: {} },
        processing: { steps: [], updated_at: now },
        settings: {},
        classic: {},
      },
    };
    expect(isOtelStream(classicNonOtel)).toBe(false);
  });
});
