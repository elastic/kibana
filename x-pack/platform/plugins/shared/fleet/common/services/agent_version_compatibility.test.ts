/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  agentSatisfiesPackageVersionCondition,
  getAgentVersionBlockers,
  getIncompatibleIntegrations,
} from './agent_version_compatibility';

const aws = { name: 'aws', title: 'AWS', version: '9.0.0', version_condition: '>=9.4.0' };
const nginx = { name: 'nginx', title: 'Nginx', version: '1.0.0', version_condition: '>=8.0.0' };

describe('getIncompatibleIntegrations', () => {
  it('returns the integrations the agent is too old for', () => {
    expect(
      getIncompatibleIntegrations({ agentVersion: '9.1.0', conditions: [aws, nginx] })
    ).toEqual([aws]);
  });

  it('returns nothing when the agent satisfies every condition', () => {
    expect(
      getIncompatibleIntegrations({ agentVersion: '9.4.0', conditions: [aws, nginx] })
    ).toEqual([]);
  });

  it('only looks at the given package when asked to', () => {
    expect(
      getIncompatibleIntegrations({
        agentVersion: '7.0.0',
        conditions: [aws, nginx],
        packageName: 'nginx',
      })
    ).toEqual([nginx]);
    expect(
      getIncompatibleIntegrations({
        agentVersion: '9.1.0',
        conditions: [aws, nginx],
        packageName: 'nginx',
      })
    ).toEqual([]);
  });

  it('returns nothing without an agent version or conditions', () => {
    expect(getIncompatibleIntegrations({ conditions: [aws] })).toEqual([]);
    expect(getIncompatibleIntegrations({ agentVersion: '9.1.0' })).toEqual([]);
    expect(getIncompatibleIntegrations({ agentVersion: '9.1.0', conditions: null })).toEqual([]);
  });

  it('ignores a condition that is not a valid range', () => {
    expect(
      getIncompatibleIntegrations({
        agentVersion: '9.1.0',
        conditions: [{ ...aws, version_condition: 'not a range' }],
      })
    ).toEqual([]);
  });

  it('ignores an agent version that is not valid semver', () => {
    expect(getIncompatibleIntegrations({ agentVersion: 'dev', conditions: [aws] })).toEqual([]);
  });
});

describe('getIncompatibleIntegrations with version-specific policy semantics', () => {
  const patchLevel = {
    name: 'azure_billing',
    title: 'Azure Billing',
    version: '1.13.0',
    version_condition: '~9.4.6 || ~9.5.3 || ^9.6.0',
  };

  it('evaluates the agent at its major.minor, as version-specific policies do', () => {
    // 9.4.8 satisfies the range as written, but its `9.4` policy is filtered at 9.4.0
    expect(
      getIncompatibleIntegrations({ agentVersion: '9.4.8', conditions: [patchLevel] })
    ).toEqual([patchLevel]);
    expect(
      getIncompatibleIntegrations({ agentVersion: '9.6.2', conditions: [patchLevel] })
    ).toEqual([]);
  });

  it('treats a prerelease agent as its release version', () => {
    expect(
      getIncompatibleIntegrations({ agentVersion: '9.4.0-SNAPSHOT', conditions: [aws] })
    ).toEqual([]);
    expect(
      getIncompatibleIntegrations({ agentVersion: '9.3.0-SNAPSHOT', conditions: [aws] })
    ).toEqual([aws]);
  });
});

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

  it('treats prerelease agents as their release version', () => {
    expect(
      getAgentVersionBlockers({
        versionCondition: '^9.6.0',
        agentVersionCounts: [{ version: '9.6.0-SNAPSHOT', count: 1 }],
      })
    ).toEqual({ blockedCount: 0, blockingVersions: [] });
  });
});
