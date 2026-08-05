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
} from './traces';

describe('buildAgentBuilderTracesNamespace', () => {
  it('returns "<spaceId>.<agentId>" when an agent id is provided', () => {
    expect(buildAgentBuilderTracesNamespace({ spaceId: 'marketing', agentId: 'sales-bot' })).toBe(
      'marketing.sales-bot'
    );
  });

  it('falls back to the space id alone when the agent id is missing', () => {
    expect(buildAgentBuilderTracesNamespace({ spaceId: 'marketing' })).toBe('marketing');
  });

  it('falls back to the space id alone when the agent id is an empty string', () => {
    expect(buildAgentBuilderTracesNamespace({ spaceId: 'marketing', agentId: '' })).toBe(
      'marketing'
    );
  });

  it('never omits the space id, even without an agent', () => {
    expect(buildAgentBuilderTracesNamespace({ spaceId: 'default' })).toBe('default');
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
    expect(
      buildAgentBuilderTracesIndexName({ spaceId: 'marketing', agentId: 'sales-bot' })
    ).toBe('traces-agent_builder.otel-marketing.sales-bot');
  });

  it('falls back to the space-scoped stream name when the agent id is missing', () => {
    expect(buildAgentBuilderTracesIndexName({ spaceId: 'default' })).toBe(
      'traces-agent_builder.otel-default'
    );
  });

  it('is built from TRACES_INDEX_PREFIX', () => {
    expect(
      buildAgentBuilderTracesIndexName({ spaceId: 'marketing', agentId: 'sales-bot' })
    ).toBe(`${TRACES_INDEX_PREFIX}marketing.sales-bot`);
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
