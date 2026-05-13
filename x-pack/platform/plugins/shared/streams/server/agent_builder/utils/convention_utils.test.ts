/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getStreamConvention, getConventionHint } from './convention_utils';

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

describe('getStreamConvention', () => {
  it('returns otel for wired streams under logs.otel', () => {
    expect(getStreamConvention(createWired('logs.otel'))).toBe('otel');
    expect(getStreamConvention(createWired('logs.otel.android'))).toBe('otel');
    expect(getStreamConvention(createWired('logs.otel.nginx.error'))).toBe('otel');
  });

  it('returns otel for wired streams under logs root (non-ecs)', () => {
    expect(getStreamConvention(createWired('logs'))).toBe('otel');
  });

  it('returns ecs for wired streams under logs.ecs', () => {
    expect(getStreamConvention(createWired('logs.ecs'))).toBe('ecs');
    expect(getStreamConvention(createWired('logs.ecs.android'))).toBe('ecs');
    expect(getStreamConvention(createWired('logs.ecs.nginx.error'))).toBe('ecs');
  });

  it('returns otel for classic streams matching otel pattern', () => {
    expect(getStreamConvention(createClassic('logs-generic.otel-default'))).toBe('otel');
    expect(getStreamConvention(createClassic('logs-foo.bar.otel-baz'))).toBe('otel');
  });

  it('returns ecs for classic streams not matching otel pattern', () => {
    expect(getStreamConvention(createClassic('logs-nginx-default'))).toBe('ecs');
    expect(getStreamConvention(createClassic('metrics-system-default'))).toBe('ecs');
  });
});

describe('getConventionHint', () => {
  it('returns OTel hint with namespace guidance', () => {
    const hint = getConventionHint('otel');
    expect(hint).toContain('OTel naming convention');
    expect(hint).toContain('attributes.*');
    expect(hint).toContain('body.structured.*');
    expect(hint).toContain('resource.attributes.*');
  });

  it('returns ECS hint with schema reference', () => {
    const hint = getConventionHint('ecs');
    expect(hint).toContain('ECS naming convention');
    expect(hint).toContain('Elastic Common Schema');
  });
});
