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
} from './traces';

describe('buildAgentBuilderTracesNamespace', () => {
  it('combines the space and agent ids', () => {
    expect(buildAgentBuilderTracesNamespace({ spaceId: 'marketing', agentId: 'my-agent' })).toBe(
      'marketing.my-agent'
    );
  });

  it('preserves dots in agent ids', () => {
    expect(
      buildAgentBuilderTracesNamespace({ spaceId: 'default', agentId: 'platform.search.agent' })
    ).toBe('default.platform.search.agent');
  });
});

describe('buildAgentBuilderTracesNamespacePattern', () => {
  it('returns a dot-separated wildcard so sibling spaces are excluded', () => {
    expect(buildAgentBuilderTracesNamespacePattern('default')).toBe('default.*');
  });
});

describe('buildAgentBuilderTracesIndexName', () => {
  it('returns the per-agent data stream for a given space', () => {
    expect(buildAgentBuilderTracesIndexName({ spaceId: 'marketing', agentId: 'my-agent' })).toBe(
      'traces-agent_builder.otel-marketing.my-agent'
    );
  });

  it('returns the per-agent data stream in the default space', () => {
    expect(
      buildAgentBuilderTracesIndexName({ spaceId: 'default', agentId: 'elastic-ai-agent' })
    ).toBe('traces-agent_builder.otel-default.elastic-ai-agent');
  });
});

describe('buildAgentBuilderTracesIndexPattern', () => {
  it('returns a pattern covering every agent in a given space', () => {
    expect(buildAgentBuilderTracesIndexPattern('marketing')).toBe(
      'traces-agent_builder.otel-marketing.*'
    );
  });

  it('returns the default space pattern', () => {
    expect(buildAgentBuilderTracesIndexPattern('default')).toBe(
      'traces-agent_builder.otel-default.*'
    );
  });

  it('does not match sibling spaces whose id extends the requested one', () => {
    const pattern = buildAgentBuilderTracesIndexPattern('default');
    const siblingIndex = buildAgentBuilderTracesIndexName({
      spaceId: 'default-2',
      agentId: 'my-agent',
    });

    // Mirrors how Elasticsearch resolves a single trailing wildcard.
    const matcher = new RegExp(`^${pattern.replace(/\./g, '\\.').replace(/\*$/, '.*')}$`);
    expect(matcher.test(siblingIndex)).toBe(false);
    expect(
      matcher.test(buildAgentBuilderTracesIndexName({ spaceId: 'default', agentId: 'my-agent' }))
    ).toBe(true);
  });
});
