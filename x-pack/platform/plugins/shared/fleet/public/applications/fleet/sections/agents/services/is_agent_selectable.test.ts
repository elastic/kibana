/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent, AgentPolicy } from '../../../types';

import { isAgentSelectable } from './is_agent_selectable';

const policies = {
  regular: { id: 'regular', is_managed: false },
  hosted: { id: 'hosted', is_managed: true },
  agentless: { id: 'agentless', is_managed: false, supports_agentless: true },
} as unknown as Record<string, AgentPolicy>;

const makeAgent = (policyId: string, extra: Partial<Agent> = {}) =>
  ({ id: 'agent-1', active: true, policy_id: policyId, ...extra } as Agent);

describe('isAgentSelectable', () => {
  it('returns true for an active agent on a regular policy', () => {
    expect(isAgentSelectable(makeAgent('regular'), policies)).toBe(true);
  });

  it('returns false for an inactive agent', () => {
    expect(isAgentSelectable(makeAgent('regular', { active: false }), policies)).toBe(false);
  });

  it('returns false for an agent on a hosted policy', () => {
    expect(isAgentSelectable(makeAgent('hosted'), policies)).toBe(false);
  });

  it('returns false for an agent on an agentless policy', () => {
    expect(isAgentSelectable(makeAgent('agentless'), policies)).toBe(false);
  });

  it('returns false for an agent on a version-specific variant of an agentless policy', () => {
    expect(isAgentSelectable(makeAgent('agentless#9.6'), policies)).toBe(false);
  });

  it('returns true for an OpAMP collector on a hosted policy', () => {
    expect(isAgentSelectable(makeAgent('hosted', { type: 'OPAMP' }), policies)).toBe(true);
  });
});
