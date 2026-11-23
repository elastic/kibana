/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentPolicy } from '../types';
import type { AgentVersionBlock, PackageInfo } from '../../../../common/types';
import { allowedExperimentalValues } from '../../../../common/experimental_features';
import { ExperimentalFeaturesService } from '../../../services';

import { getIncompatibleAgentVersionStatus } from './use_incompatible_agent_version_status';

const createAgentPolicy = (
  versions: Array<{ version: string; count: number }> | undefined,
  id = 'policy-1'
): AgentPolicy =>
  ({
    id,
    active_agents_per_version: versions,
  } as unknown as AgentPolicy);

const createPackageInfo = (agentVersionCondition?: string): PackageInfo =>
  ({
    conditions: agentVersionCondition ? { agent: { version: agentVersionCondition } } : undefined,
  } as unknown as PackageInfo);

describe('getIncompatibleAgentVersionStatus', () => {
  beforeEach(() => {
    ExperimentalFeaturesService.init(allowedExperimentalValues);
  });

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

  it('returns { status: NONE } when agent policy has no active_agents_per_version', () => {
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
    expect(result).toEqual({
      status: 'SOME',
      versionCondition: '>=8.0.0',
      blockedCount: 2,
      observedVersions: ['7.17.0'],
      minVersion: '8.0.0',
      agentPolicyCount: 1,
      requiresAcknowledgement: true,
    });
  });

  it('returns { status: ALL } with versionCondition when all agents are incompatible', () => {
    const result = getIncompatibleAgentVersionStatus(createPackageInfo('>=8.0.0'), [
      createAgentPolicy([
        { version: '7.16.0', count: 2 },
        { version: '7.17.0', count: 3 },
      ]),
    ]);
    expect(result).toEqual({
      status: 'ALL',
      versionCondition: '>=8.0.0',
      blockedCount: 5,
      observedVersions: ['7.16.0', '7.17.0'],
      minVersion: '8.0.0',
      agentPolicyCount: 1,
      requiresAcknowledgement: true,
    });
  });

  it('returns { status: SOME } across multiple agent policies with mixed compatibility', () => {
    const result = getIncompatibleAgentVersionStatus(createPackageInfo('>=8.0.0'), [
      createAgentPolicy([{ version: '8.1.0', count: 5 }]),
      createAgentPolicy([
        { version: '7.17.0', count: 2 },
        { version: '8.1.0', count: 3 },
      ]),
    ]);
    expect(result).toEqual({
      status: 'SOME',
      versionCondition: '>=8.0.0',
      blockedCount: 2,
      observedVersions: ['7.17.0'],
      minVersion: '8.0.0',
      agentPolicyCount: 2,
      requiresAcknowledgement: true,
    });
  });

  it('returns { status: ALL } when all agents across all policies are incompatible', () => {
    const result = getIncompatibleAgentVersionStatus(createPackageInfo('>=8.0.0'), [
      createAgentPolicy([{ version: '7.16.0', count: 2 }]),
      createAgentPolicy([{ version: '7.17.0', count: 3 }]),
    ]);
    expect(result).toEqual({
      status: 'ALL',
      versionCondition: '>=8.0.0',
      blockedCount: 5,
      observedVersions: ['7.16.0', '7.17.0'],
      minVersion: '8.0.0',
      agentPolicyCount: 2,
      requiresAcknowledgement: true,
    });
  });

  describe('pre-release version coercion', () => {
    it('treats a pre-release version as its base version when it satisfies the condition', () => {
      const result = getIncompatibleAgentVersionStatus(createPackageInfo('>=9.0.0'), [
        createAgentPolicy([{ version: '9.6.0-SNAPSHOT', count: 1 }]),
      ]);
      expect(result).toEqual({ status: 'NONE' });
    });

    it('treats a pre-release version as its base version when it does not satisfy the condition', () => {
      const result = getIncompatibleAgentVersionStatus(createPackageInfo('>=8.0.0'), [
        createAgentPolicy([{ version: '7.17.0-SNAPSHOT', count: 1 }]),
      ]);
      expect(result).toEqual({
        status: 'ALL',
        versionCondition: '>=8.0.0',
        blockedCount: 1,
        observedVersions: ['7.17.0-SNAPSHOT'],
        minVersion: '8.0.0',
        agentPolicyCount: 1,
        requiresAcknowledgement: true,
      });
    });

    it('returns SOME when pre-release agents satisfy the condition but others do not', () => {
      const result = getIncompatibleAgentVersionStatus(createPackageInfo('>=8.0.0'), [
        createAgentPolicy([
          { version: '9.0.0-SNAPSHOT', count: 2 },
          { version: '7.17.0', count: 3 },
        ]),
      ]);
      expect(result).toEqual({
        status: 'SOME',
        versionCondition: '>=8.0.0',
        blockedCount: 3,
        observedVersions: ['7.17.0'],
        minVersion: '8.0.0',
        agentPolicyCount: 1,
        requiresAcknowledgement: true,
      });
    });

    it('returns NONE when all agents are pre-release versions that satisfy the condition', () => {
      const result = getIncompatibleAgentVersionStatus(createPackageInfo('>=8.0.0'), [
        createAgentPolicy([
          { version: '8.1.0-SNAPSHOT', count: 2 },
          { version: '9.0.0-SNAPSHOT', count: 3 },
        ]),
      ]);
      expect(result).toEqual({ status: 'NONE' });
    });
  });

  it('returns { status: NONE } when the agent policies have no active agents', () => {
    const result = getIncompatibleAgentVersionStatus(createPackageInfo('>=8.0.0'), [
      createAgentPolicy([]),
    ]);
    expect(result).toEqual({ status: 'NONE' });
  });

  it('evaluates agents at their major.minor, as Fleet does when deploying the policy', () => {
    const result = getIncompatibleAgentVersionStatus(
      createPackageInfo('~9.4.6 || ~9.5.3 || ^9.6.0'),
      [
        createAgentPolicy([
          { version: '9.4.8', count: 40 },
          { version: '9.6.1', count: 2 },
        ]),
      ]
    );
    // 9.4.8 is in `~9.4.6` but is evaluated as 9.4.0, so the agents need 9.6.0
    expect(result).toEqual({
      status: 'SOME',
      versionCondition: '~9.4.6 || ~9.5.3 || ^9.6.0',
      blockedCount: 40,
      observedVersions: ['9.4.8'],
      minVersion: '9.6.0',
      agentPolicyCount: 1,
      requiresAcknowledgement: true,
    });
  });
  it('does not count the agents that already lack the inputs under the current condition', () => {
    const result = getIncompatibleAgentVersionStatus(
      createPackageInfo('^9.4.0'),
      [
        createAgentPolicy([
          { version: '9.2.0', count: 1 },
          { version: '9.3.1', count: 2 },
          { version: '9.4.2', count: 5 },
        ]),
        // Added by the edit, so its agents never had the inputs
        createAgentPolicy([{ version: '9.2.0', count: 3 }], 'policy-2'),
      ],
      undefined,
      { versionCondition: '^9.3.0', agentPolicyIds: ['policy-1'] }
    );
    expect(result).toEqual({
      status: 'SOME',
      versionCondition: '^9.4.0',
      blockedCount: 5,
      observedVersions: ['9.2.0', '9.3.1'],
      minVersion: '9.4.0',
      agentPolicyCount: 2,
      requiresAcknowledgement: true,
    });
  });

  it('returns NONE when the current condition already excludes every blocked agent', () => {
    const result = getIncompatibleAgentVersionStatus(
      createPackageInfo('^9.4.0'),
      [createAgentPolicy([{ version: '9.3.1', count: 2 }])],
      undefined,
      { versionCondition: '^9.4.0', agentPolicyIds: ['policy-1'] }
    );
    expect(result).toEqual({ status: 'NONE' });
  });

  it('does not require an acknowledgement nor describe data loss without version-specific policies', () => {
    ExperimentalFeaturesService.init({
      ...allowedExperimentalValues,
      enableVersionSpecificPolicies: false,
    });

    const result = getIncompatibleAgentVersionStatus(createPackageInfo('>=9.0.0'), [
      createAgentPolicy([{ version: '8.19.0', count: 1 }]),
    ]);

    // Those agents keep the integration's inputs, so there is no data loss to describe
    expect(result).toEqual({
      status: 'ALL',
      versionCondition: '>=9.0.0',
      agentPolicyCount: 1,
      requiresAcknowledgement: false,
    });
  });

  describe('with the agent version block returned by Fleet', () => {
    const serverAgentVersionBlock: AgentVersionBlock = {
      package_name: 'test',
      package_version: '1.0.0',
      version_condition: '^9.4.0',
    };

    it('reports the incompatibility that the agent counts do not show', () => {
      const result = getIncompatibleAgentVersionStatus(
        createPackageInfo('^9.4.0'),
        [createAgentPolicy(undefined)],
        serverAgentVersionBlock
      );

      expect(result).toEqual({
        status: 'SOME',
        versionCondition: '^9.4.0',
        blockedCount: undefined,
        observedVersions: undefined,
        agentPolicyCount: 1,
        requiresAcknowledgement: true,
      });
    });

    it('prefers the agent counts when they show the incompatibility', () => {
      const result = getIncompatibleAgentVersionStatus(
        createPackageInfo('^9.4.0'),
        [createAgentPolicy([{ version: '9.3.0', count: 2 }])],
        serverAgentVersionBlock
      );

      expect(result).toMatchObject({ status: 'ALL', blockedCount: 2 });
    });
  });
});
