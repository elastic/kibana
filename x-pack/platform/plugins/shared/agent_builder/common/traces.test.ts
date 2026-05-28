/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAgentBuilderTracesIndexPattern } from './traces';

describe('buildAgentBuilderTracesIndexPattern', () => {
  it('returns the space-scoped index pattern for a given space', () => {
    expect(buildAgentBuilderTracesIndexPattern('marketing')).toBe(
      'traces-agent_builder.otel-marketing'
    );
  });

  it('returns the default space index pattern', () => {
    expect(buildAgentBuilderTracesIndexPattern('default')).toBe(
      'traces-agent_builder.otel-default'
    );
  });
});
