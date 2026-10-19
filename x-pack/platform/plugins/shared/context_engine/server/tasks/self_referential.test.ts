/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isSelfReferentialTarget } from './self_referential';

describe('isSelfReferentialTarget', () => {
  it('matches the signals indices', () => {
    expect(isSelfReferentialTarget('context-engine-signals-default')).toBe(true);
    expect(isSelfReferentialTarget('context-engine-signals-*')).toBe(true);
  });

  it('matches the improvements index', () => {
    expect(isSelfReferentialTarget('context-engine-improvements')).toBe(true);
    expect(isSelfReferentialTarget('context-engine-improvements*')).toBe(true);
  });

  it('matches the Agent Builder traces indices', () => {
    expect(isSelfReferentialTarget('traces-agent_builder.otel-default')).toBe(true);
    expect(isSelfReferentialTarget('traces-agent_builder.otel-*')).toBe(true);
  });

  it('matches the AI index registry system index', () => {
    expect(isSelfReferentialTarget('.contextengine-ai-indices')).toBe(true);
  });

  it('matches data-stream backing indices', () => {
    expect(isSelfReferentialTarget('.ds-traces-agent_builder.otel-default-2026.08.10-000001')).toBe(
      true
    );
  });

  it('matches a wildcard broader than the prefix but still scoped to Context Engine', () => {
    expect(isSelfReferentialTarget('context-engine-*')).toBe(true);
    expect(isSelfReferentialTarget('context-*')).toBe(true);
  });

  it('matches regardless of quoting, casing, and surrounding whitespace', () => {
    expect(isSelfReferentialTarget('  "Context-Engine-Signals-Default"  ')).toBe(true);
  });

  it('matches a cluster-qualified expression', () => {
    expect(isSelfReferentialTarget('remote_cluster:context-engine-signals-default')).toBe(true);
  });

  it('matches when only one expression of a multi-index target qualifies', () => {
    expect(isSelfReferentialTarget('logs-*, context-engine-signals-default')).toBe(true);
  });

  it('does not match ordinary user indices', () => {
    expect(isSelfReferentialTarget('logs-*')).toBe(false);
    expect(isSelfReferentialTarget('ai-index-ds-support')).toBe(false);
    expect(isSelfReferentialTarget('my-context-engine-notes')).toBe(false);
  });

  it('does not match a bare wildcard, which is a genuine coverage signal', () => {
    expect(isSelfReferentialTarget('*')).toBe(false);
  });

  it('does not match a missing target', () => {
    expect(isSelfReferentialTarget(undefined)).toBe(false);
    expect(isSelfReferentialTarget('')).toBe(false);
  });
});
