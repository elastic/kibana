/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isOtelStream } from './is_otel_stream';

describe('isOtelStream', () => {
  const now = new Date().toISOString();

  const createWired = (name: string) => ({
    type: 'wired' as const,
    name,
    description: '',
    updated_at: now,
    ingest: {
      lifecycle: { inherit: {} },
      failure_store: { inherit: {} },
      processing: { steps: [], updated_at: now },
      settings: {},
      wired: { fields: {}, routing: [] },
    },
  });

  const createClassic = (name: string) => ({
    type: 'classic' as const,
    name,
    description: '',
    updated_at: now,
    ingest: {
      lifecycle: { inherit: {} },
      failure_store: { inherit: {} },
      processing: { steps: [], updated_at: now },
      settings: {},
      classic: {},
    },
  });

  it('returns true for a wired stream under logs root', () => {
    expect(isOtelStream(createWired('logs'))).toBe(true);
  });

  it('returns true for a wired stream under logs.otel', () => {
    expect(isOtelStream(createWired('logs.otel'))).toBe(true);
    expect(isOtelStream(createWired('logs.otel.nginx'))).toBe(true);
  });

  it('returns false for a wired stream under logs.ecs', () => {
    expect(isOtelStream(createWired('logs.ecs'))).toBe(false);
    expect(isOtelStream(createWired('logs.ecs.windows'))).toBe(false);
    expect(isOtelStream(createWired('logs.ecs.apache.error'))).toBe(false);
  });

  it('returns true for a non-wired classic stream matching otel pattern', () => {
    expect(isOtelStream(createClassic('logs-foo.bar.otel-baz'))).toBe(true);
  });

  it('returns false for a classic stream not matching otel pattern', () => {
    expect(isOtelStream(createClassic('logs-foo-bar-baz'))).toBe(false);
  });
});
