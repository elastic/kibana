/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  agentLosesPackageInputs,
  agentSatisfiesPackageVersionCondition,
  getAgentVersionBlockers,
} from './agent_version_compatibility';

describe('agentSatisfiesPackageVersionCondition', () => {
  it('evaluates the agent at major.minor.0', () => {
    expect(agentSatisfiesPackageVersionCondition('9.4.8', '>=9.4.6')).toBe(false);
    expect(agentSatisfiesPackageVersionCondition('9.5.0', '>=9.4.6')).toBe(true);
    expect(agentSatisfiesPackageVersionCondition('9.4.8', '^9.4.0')).toBe(true);
  });

  it('returns undefined for an agent version that cannot be parsed', () => {
    expect(agentSatisfiesPackageVersionCondition('dev', '^9.4.0')).toBeUndefined();
  });
});

describe('getAgentVersionBlockers', () => {
  it('returns no blockers when every agent satisfies the condition', () => {
    expect(
      getAgentVersionBlockers({
        versionCondition: '^9.4.0',
        agentVersionCounts: [
          { version: '9.4.0', count: 2 },
          { version: '9.5.1', count: 3 },
        ],
      })
    ).toEqual({ blockedCount: 0, blockingVersions: [] });
  });

  it('returns no blockers without agents', () => {
    expect(getAgentVersionBlockers({ versionCondition: '^9.4.0', agentVersionCounts: [] })).toEqual(
      { blockedCount: 0, blockingVersions: [] }
    );
  });

  it('counts the blocking agents and suggests the minimum version above them', () => {
    expect(
      getAgentVersionBlockers({
        versionCondition: '^9.4.0',
        agentVersionCounts: [
          { version: '9.3.2', count: 2 },
          { version: '9.2.0', count: 1 },
          { version: '9.4.1', count: 5 },
        ],
      })
    ).toEqual({ blockedCount: 3, blockingVersions: ['9.2.0', '9.3.2'], minVersion: '9.4.0' });
  });

  it('suggests the lowest major.minor satisfying the condition, as agents are evaluated there', () => {
    expect(
      getAgentVersionBlockers({
        versionCondition: '~9.4.6 || ~9.5.3 || ^9.6.0',
        agentVersionCounts: [
          { version: '9.4.8', count: 40 },
          { version: '9.6.0', count: 2 },
        ],
      })
    ).toEqual({ blockedCount: 40, blockingVersions: ['9.4.8'], minVersion: '9.6.0' });
    expect(
      getAgentVersionBlockers({
        versionCondition: '>=9.3.5',
        agentVersionCounts: [{ version: '9.3.8', count: 1 }],
      })
    ).toEqual({ blockedCount: 1, blockingVersions: ['9.3.8'], minVersion: '9.4.0' });
  });

  it('does not suggest a version below the blocking agents', () => {
    expect(
      getAgentVersionBlockers({
        versionCondition: '<9.0.0 || >=9.6.0',
        agentVersionCounts: [{ version: '9.3.0', count: 1 }],
      })
    ).toEqual({ blockedCount: 1, blockingVersions: ['9.3.0'] });
  });

  it('blocks every agent when the condition is not a valid range', () => {
    expect(
      getAgentVersionBlockers({
        versionCondition: 'not a range',
        agentVersionCounts: [{ version: '9.6.0', count: 4 }],
      })
    ).toEqual({ blockedCount: 4, blockingVersions: ['9.6.0'] });
  });

  it('ignores agents whose version cannot be parsed', () => {
    expect(
      getAgentVersionBlockers({
        versionCondition: '^9.4.0',
        agentVersionCounts: [{ version: 'dev', count: 4 }],
      })
    ).toEqual({ blockedCount: 0, blockingVersions: [] });
  });

  it('sorts the blocking versions in version order', () => {
    expect(
      getAgentVersionBlockers({
        versionCondition: '>=11.0.0',
        agentVersionCounts: [
          { version: '10.0.0', count: 1 },
          { version: '9.10.0', count: 1 },
          { version: '9.2.0', count: 1 },
        ],
      }).blockingVersions
    ).toEqual(['9.2.0', '9.10.0', '10.0.0']);
  });

  it('treats prerelease agents as their release version', () => {
    expect(
      getAgentVersionBlockers({
        versionCondition: '^9.6.0',
        agentVersionCounts: [{ version: '9.6.0-SNAPSHOT', count: 1 }],
      })
    ).toEqual({ blockedCount: 0, blockingVersions: [] });
  });
});

describe('agentLosesPackageInputs', () => {
  it('is true for agents that do not satisfy the condition at major.minor.0', () => {
    expect(agentLosesPackageInputs('9.4.8', '^9.4.6')).toBe(true);
    expect(agentLosesPackageInputs('9.5.0', '^9.4.6')).toBe(false);
  });

  it('is true for every agent when the condition is not a valid range', () => {
    expect(agentLosesPackageInputs('9.6.0', 'not a range')).toBe(true);
  });

  it('is false for agents whose version cannot be parsed', () => {
    expect(agentLosesPackageInputs('dev', '^9.4.0')).toBe(false);
  });
});
