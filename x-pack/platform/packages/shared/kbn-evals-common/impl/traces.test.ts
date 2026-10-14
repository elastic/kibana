/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TRACES_NAMESPACE_FIELD,
  buildAgentBuilderSpaceTracesIndex,
  buildSpaceTracesIndexPattern,
  buildTracesNamespaceFilter,
} from './traces';

describe('traces helpers', () => {
  it('builds the Agent Builder traces index of a space', () => {
    expect(buildAgentBuilderSpaceTracesIndex('default')).toBe('traces-agent_builder.otel-default');
    expect(buildAgentBuilderSpaceTracesIndex('marketing')).toBe(
      'traces-agent_builder.otel-marketing'
    );
  });

  it('builds an index pattern matching every dataset of one space only', () => {
    expect(buildSpaceTracesIndexPattern('default')).toBe('traces-*-default');
    expect(buildSpaceTracesIndexPattern('marketing')).toBe('traces-*-marketing');
  });

  it('builds a data stream namespace filter', () => {
    expect(TRACES_NAMESPACE_FIELD).toBe('data_stream.namespace');
    expect(buildTracesNamespaceFilter('marketing')).toEqual({
      term: { 'data_stream.namespace': 'marketing' },
    });
  });
});
