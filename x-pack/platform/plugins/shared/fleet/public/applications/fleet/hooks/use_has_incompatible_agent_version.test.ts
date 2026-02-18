/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentPolicy } from '../types';
import type { PackageInfo } from '../../../../common/types';

import { getIncompatibleAgentVersionStatus } from './use_has_incompatible_agent_version';

const createAgentPolicy = (
  versions: Array<{ version: string; count: number }> | undefined
): AgentPolicy =>
  ({
    agents_per_version: versions,
  } as unknown as AgentPolicy);

const createPackageInfo = (agentVersionCondition?: string): PackageInfo =>
  ({
    conditions: agentVersionCondition ? { agent: { version: agentVersionCondition } } : undefined,
  } as unknown as PackageInfo);

describe('getIncompatibleAgentVersionStatus', () => {
  it('returns NONE when packageInfo is undefined', () => {
    const result = getIncompatibleAgentVersionStatus(undefined, []);
    expect(result).toBe('NONE');
  });

  it('returns NONE when no agent version condition is set', () => {
    const result = getIncompatibleAgentVersionStatus(createPackageInfo(), []);
    expect(result).toBe('NONE');
  });

  it('returns NONE when agentPolicies is undefined', () => {
    const result = getIncompatibleAgentVersionStatus(createPackageInfo('>=8.0.0'), undefined);
    expect(result).toBe('NONE');
  });

  it('returns NONE when agentPolicies is empty', () => {
    const result = getIncompatibleAgentVersionStatus(createPackageInfo('>=8.0.0'), []);
    expect(result).toBe('NONE');
  });

  it('returns NONE when agent policy has no agents_per_version', () => {
    const result = getIncompatibleAgentVersionStatus(createPackageInfo('>=8.0.0'), [
      createAgentPolicy(undefined),
    ]);
    expect(result).toBe('NONE');
  });

  it('returns NONE when all agents satisfy the version condition', () => {
    const result = getIncompatibleAgentVersionStatus(createPackageInfo('>=8.0.0'), [
      createAgentPolicy([
        { version: '8.1.0', count: 3 },
        { version: '8.2.0', count: 5 },
      ]),
    ]);
    expect(result).toBe('NONE');
  });

  it('returns SOME when some agents are incompatible and some are compatible', () => {
    const result = getIncompatibleAgentVersionStatus(createPackageInfo('>=8.0.0'), [
      createAgentPolicy([
        { version: '7.17.0', count: 2 },
        { version: '8.1.0', count: 5 },
      ]),
    ]);
    expect(result).toBe('SOME');
  });

  it('returns ALL when all agents are incompatible', () => {
    const result = getIncompatibleAgentVersionStatus(createPackageInfo('>=8.0.0'), [
      createAgentPolicy([
        { version: '7.16.0', count: 2 },
        { version: '7.17.0', count: 3 },
      ]),
    ]);
    expect(result).toBe('ALL');
  });

  it('returns SOME across multiple agent policies with mixed compatibility', () => {
    const result = getIncompatibleAgentVersionStatus(createPackageInfo('>=8.0.0'), [
      createAgentPolicy([{ version: '8.1.0', count: 5 }]),
      createAgentPolicy([
        { version: '7.17.0', count: 2 },
        { version: '8.1.0', count: 3 },
      ]),
    ]);
    expect(result).toBe('SOME');
  });

  it('returns ALL when all agents across all policies are incompatible', () => {
    const result = getIncompatibleAgentVersionStatus(createPackageInfo('>=8.0.0'), [
      createAgentPolicy([{ version: '7.16.0', count: 2 }]),
      createAgentPolicy([{ version: '7.17.0', count: 3 }]),
    ]);
    expect(result).toBe('ALL');
  });
});
