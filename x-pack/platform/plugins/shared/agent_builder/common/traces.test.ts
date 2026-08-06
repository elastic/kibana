/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildAgentBuilderTracesIndexName,
  buildAgentBuilderTracesIndexPattern,
  buildAgentBuilderTracesNamespace,
  buildAgentBuilderTracesNamespacePattern,
  TRACES_INDEX_PREFIX,
  UNRESOLVED_AGENT_NAMESPACE_SEGMENT,
} from './traces';

/** Mirrors how ES matches a `<prefix>.*` index pattern against a concrete stream name. */
const patternMatches = (pattern: string, name: string): boolean => {
  const regex = new RegExp(
    `^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`
  );
  return regex.test(name);
};

describe('buildAgentBuilderTracesNamespace', () => {
  it('returns "<spaceId>.<agentId>" when an agent id is provided', () => {
    expect(buildAgentBuilderTracesNamespace({ spaceId: 'marketing', agentId: 'sales-bot' })).toBe(
      'marketing.sales-bot'
    );
  });

  it('falls back to "<spaceId>.<unresolved>" when the agent id is missing', () => {
    expect(buildAgentBuilderTracesNamespace({ spaceId: 'marketing' })).toBe(
      `marketing.${UNRESOLVED_AGENT_NAMESPACE_SEGMENT}`
    );
  });

  it('falls back to "<spaceId>.<unresolved>" when the agent id is an empty string', () => {
    expect(buildAgentBuilderTracesNamespace({ spaceId: 'marketing', agentId: '' })).toBe(
      `marketing.${UNRESOLVED_AGENT_NAMESPACE_SEGMENT}`
    );
  });

  it('always keeps the space id as the first segment and never emits a bare namespace', () => {
    expect(buildAgentBuilderTracesNamespace({ spaceId: 'default' })).toBe(
      `default.${UNRESOLVED_AGENT_NAMESPACE_SEGMENT}`
    );
    expect(buildAgentBuilderTracesNamespace({ spaceId: 'default' })).not.toBe('default');
  });

  it('keeps the space scope even when an agent id itself contains a dot', () => {
    // The first `.` after the space id is the space boundary; the read pattern still matches.
    expect(buildAgentBuilderTracesNamespace({ spaceId: 'marketing', agentId: 'foo.bar' })).toBe(
      'marketing.foo.bar'
    );
  });

  it('produces a namespace the space read pattern always matches (fallback and resolved alike)', () => {
    const readPattern = buildAgentBuilderTracesNamespacePattern('marketing');
    expect(
      patternMatches(readPattern, buildAgentBuilderTracesNamespace({ spaceId: 'marketing' }))
    ).toBe(true);
    expect(
      patternMatches(
        readPattern,
        buildAgentBuilderTracesNamespace({ spaceId: 'marketing', agentId: 'sales-bot' })
      )
    ).toBe(true);
    // ...but never matches a sibling space, even one sharing a name prefix.
    expect(
      patternMatches(
        readPattern,
        buildAgentBuilderTracesNamespace({ spaceId: 'marketing2', agentId: 'x' })
      )
    ).toBe(false);
  });
});

describe('buildAgentBuilderTracesNamespacePattern', () => {
  it('returns the wildcard namespace pattern for a space', () => {
    expect(buildAgentBuilderTracesNamespacePattern('marketing')).toBe('marketing.*');
  });

  it('returns the wildcard namespace pattern for the default space', () => {
    expect(buildAgentBuilderTracesNamespacePattern('default')).toBe('default.*');
  });
});

describe('buildAgentBuilderTracesIndexName', () => {
  it('returns the concrete per-agent data-stream name', () => {
    expect(buildAgentBuilderTracesIndexName({ spaceId: 'marketing', agentId: 'sales-bot' })).toBe(
      'traces-agent_builder.otel-marketing.sales-bot'
    );
  });

  it('falls back to the unresolved-agent stream name when the agent id is missing', () => {
    expect(buildAgentBuilderTracesIndexName({ spaceId: 'default' })).toBe(
      `traces-agent_builder.otel-default.${UNRESOLVED_AGENT_NAMESPACE_SEGMENT}`
    );
  });

  it('is built from TRACES_INDEX_PREFIX', () => {
    expect(buildAgentBuilderTracesIndexName({ spaceId: 'marketing', agentId: 'sales-bot' })).toBe(
      `${TRACES_INDEX_PREFIX}marketing.sales-bot`
    );
  });
});

describe('buildAgentBuilderTracesIndexPattern', () => {
  it('returns the per-space wildcard index pattern covering every agent stream', () => {
    expect(buildAgentBuilderTracesIndexPattern('marketing')).toBe(
      'traces-agent_builder.otel-marketing.*'
    );
  });

  it('returns the default space index pattern', () => {
    expect(buildAgentBuilderTracesIndexPattern('default')).toBe(
      'traces-agent_builder.otel-default.*'
    );
  });
});
