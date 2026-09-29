/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isAgentRestartSupported,
  MINIMUM_RESTART_AGENT_VERSION,
} from './is_agent_restart_supported';

function makeAgent(version: string | undefined, active = true) {
  return {
    active,
    local_metadata: {
      elastic: {
        agent: version !== undefined ? { version } : {},
      },
    },
  } as any;
}

describe('isAgentRestartSupported', () => {
  it('returns true for agent at minimum version', () => {
    expect(isAgentRestartSupported(makeAgent(MINIMUM_RESTART_AGENT_VERSION))).toBe(true);
  });

  it('returns true for agent above minimum version', () => {
    expect(isAgentRestartSupported(makeAgent('9.7.0'))).toBe(true);
  });

  it('returns false for agent below minimum version', () => {
    expect(isAgentRestartSupported(makeAgent('9.5.9'))).toBe(false);
  });

  it('returns false for inactive agent even if version qualifies', () => {
    expect(isAgentRestartSupported(makeAgent('9.6.0', false))).toBe(false);
  });

  it('returns false when version is missing', () => {
    expect(isAgentRestartSupported(makeAgent(undefined))).toBe(false);
  });

  it('returns false when version is not a string', () => {
    const agent = { active: true, local_metadata: { elastic: { agent: { version: 960 } } } } as any;
    expect(isAgentRestartSupported(agent)).toBe(false);
  });

  it('returns true for SNAPSHOT build at minimum version', () => {
    expect(isAgentRestartSupported(makeAgent('9.6.0-SNAPSHOT'))).toBe(true);
  });

  it('returns true for SNAPSHOT build above minimum version', () => {
    expect(isAgentRestartSupported(makeAgent('9.7.0-SNAPSHOT'))).toBe(true);
  });

  it('returns false for SNAPSHOT build below minimum version', () => {
    expect(isAgentRestartSupported(makeAgent('9.5.0-SNAPSHOT'))).toBe(false);
  });

  it('returns false for malformed version string', () => {
    expect(isAgentRestartSupported(makeAgent('not-a-version'))).toBe(false);
  });
});
