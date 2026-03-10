/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentPolicy } from '../types';
import type { PackageInfo } from '../../../../common/types';

import { getIncompatibleAgentVersionStatus } from './use_incompatible_agent_version_status';

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
  it('returns { status: NONE } when packageInfo is undefined', () => {
    const result = getIncompatibleAgentVersionStatus(undefined, []);
    expect(result).toEqual({ status: 'NONE' });
  });

  it('returns { status: NONE } when no agent version condition is set', () => {
    const result = getIncompatibleAgentVersionStatus(createPackageInfo(), []);
    expect(result).toEqual({ status: 'NONE' });
  });

  it('returns { status: NONE } when agentPolicies is undefined', () => {
    const result = getIncompatibleAgentVersionStatus(createPackageInfo('>=8.0.0'), undefined);
    expect(result).toEqual({ status: 'NONE' });
  });

  it('returns { status: NONE } when agentPolicies is empty', () => {
    const result = getIncompatibleAgentVersionStatus(createPackageInfo('>=8.0.0'), []);
    expect(result).toEqual({ status: 'NONE' });
  });

  it('returns { status: NONE } when agent policy has no agents_per_version', () => {
    const result = getIncompatibleAgentVersionStatus(createPackageInfo('>=8.0.0'), [
      createAgentPolicy(undefined),
    ]);
    expect(result).toEqual({ status: 'NONE' });
  });

  it('returns { status: NONE } when all agents satisfy the version condition', () => {
    const result = getIncompatibleAgentVersionStatus(createPackageInfo('>=8.0.0'), [
      createAgentPolicy([
        { version: '8.1.0', count: 3 },
        { version: '8.2.0', count: 5 },
      ]),
    ]);
    expect(result).toEqual({ status: 'NONE' });
  });

  it('returns { status: SOME } with versionCondition when some agents are incompatible', () => {
    const result = getIncompatibleAgentVersionStatus(createPackageInfo('>=8.0.0'), [
      createAgentPolicy([
        { version: '7.17.0', count: 2 },
        { version: '8.1.0', count: 5 },
      ]),
    ]);
    expect(result).toEqual({ status: 'SOME', versionCondition: '>=8.0.0' });
  });

  it('returns { status: ALL } with versionCondition when all agents are incompatible', () => {
    const result = getIncompatibleAgentVersionStatus(createPackageInfo('>=8.0.0'), [
      createAgentPolicy([
        { version: '7.16.0', count: 2 },
        { version: '7.17.0', count: 3 },
      ]),
    ]);
    expect(result).toEqual({ status: 'ALL', versionCondition: '>=8.0.0' });
  });

  it('returns { status: SOME } across multiple agent policies with mixed compatibility', () => {
    const result = getIncompatibleAgentVersionStatus(createPackageInfo('>=8.0.0'), [
      createAgentPolicy([{ version: '8.1.0', count: 5 }]),
      createAgentPolicy([
        { version: '7.17.0', count: 2 },
        { version: '8.1.0', count: 3 },
      ]),
    ]);
    expect(result).toEqual({ status: 'SOME', versionCondition: '>=8.0.0' });
  });

  it('returns { status: ALL } when all agents across all policies are incompatible', () => {
    const result = getIncompatibleAgentVersionStatus(createPackageInfo('>=8.0.0'), [
      createAgentPolicy([{ version: '7.16.0', count: 2 }]),
      createAgentPolicy([{ version: '7.17.0', count: 3 }]),
    ]);
    expect(result).toEqual({ status: 'ALL', versionCondition: '>=8.0.0' });
  });
});
