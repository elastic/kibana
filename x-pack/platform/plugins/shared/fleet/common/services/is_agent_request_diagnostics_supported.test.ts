/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent } from '../types/models/agent';

import { isAgentRequestDiagnosticsSupported } from '.';

const getAgent = ({ version, active = true }: { active?: boolean; version: string }): Agent => {
  const agent: Agent = {
    id: 'agent1',
    active,
    type: 'PERMANENT',
    enrolled_at: '2023-02-08T20:24:08.347Z',
    user_provided_metadata: {},
    local_metadata: {
      elastic: {
        agent: {
          version,
        },
      },
    },
    packages: ['system'],
  };
  return agent;
};
describe('Fleet - isAgentRequestDiagnosticsSupported', () => {
  it('returns false if agent version < 8.7', () => {
    expect(isAgentRequestDiagnosticsSupported(getAgent({ version: '7.9.0' }))).toBe(false);
  });

  it('returns true if agent version is 8.7', () => {
    expect(isAgentRequestDiagnosticsSupported(getAgent({ version: '8.7.0' }))).toBe(true);
  });

  it('returns true if agent version > 8.7', () => {
    expect(isAgentRequestDiagnosticsSupported(getAgent({ version: '8.8.0' }))).toBe(true);
  });

  it('returns false if agent version > 8.7 and agent is inactive', () => {
    expect(isAgentRequestDiagnosticsSupported(getAgent({ active: false, version: '8.8.0' }))).toBe(
      false
    );
  });
});
