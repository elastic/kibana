/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { AGENT_BUILDER_BUILTIN_AGENTS } from '../allow_lists';
import { normalizeAgentIdForTelemetry, toCustomHashedId } from './hashing';

describe('normalizeAgentIdForTelemetry', () => {
  it('returns undefined for missing or empty ids', () => {
    expect(normalizeAgentIdForTelemetry()).toBeUndefined();
    expect(normalizeAgentIdForTelemetry('')).toBeUndefined();
  });

  it('keeps the default built-in agent id', () => {
    expect(normalizeAgentIdForTelemetry(agentBuilderDefaultAgentId)).toBe(
      agentBuilderDefaultAgentId
    );
  });

  it('keeps allow-listed built-in agent ids', () => {
    expect(normalizeAgentIdForTelemetry(AGENT_BUILDER_BUILTIN_AGENTS[0])).toBe(
      AGENT_BUILDER_BUILTIN_AGENTS[0]
    );
  });

  it('hashes custom agent ids as custom-<hash>', () => {
    expect(normalizeAgentIdForTelemetry('my-agent')).toBe(toCustomHashedId('my-agent'));
  });
});
