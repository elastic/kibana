/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent } from '@kbn/fleet-plugin/common';
import {
  aggregateInstanceChipStates,
  buildIncomingDataRequests,
  deriveInstanceChipState,
  getApplicableAgents,
  getAgentHealthState,
  getAgentPolicyIdsByInstance,
  instanceHasData,
  pickWorstAgentInstanceId,
  summarizeInstanceAgents,
} from './agent_detection';

const makeAgent = (id: string, status: Agent['status'], policyId = 'policy-1'): Agent =>
  ({ id, status, policy_id: policyId } as Agent);

describe('getAgentHealthState', () => {
  it.each([
    ['online', 'healthy'],
    ['enrolling', 'pending'],
    ['updating', 'pending'],
    ['error', 'unhealthy'],
    ['degraded', 'unhealthy'],
    ['offline', 'unhealthy'],
    [undefined, 'pending'],
  ] as const)(
    'maps an agent with status %s to %s when there is no package policy scope',
    (status, expected) => {
      expect(getAgentHealthState(makeAgent('a1', status))).toBe(expected);
    }
  );

  it('is unhealthy when the deployed integration has failed or degraded units, even if online', () => {
    expect(getAgentHealthState(makeAgent('a1', 'online'), 'failed')).toBe('unhealthy');
    expect(getAgentHealthState(makeAgent('a1', 'online'), 'degraded')).toBe('unhealthy');
  });

  it('ignores an agent failure that is outside the deployed integration', () => {
    const agent = { ...makeAgent('a1', 'error'), components: [{ id: 'c1' }] } as unknown as Agent;
    expect(getAgentHealthState(agent, null)).toBe('healthy');
    expect(getAgentHealthState({ ...agent, status: 'degraded' }, null)).toBe('healthy');
  });

  it('keeps an agent failure when the agent reports no components to scope by', () => {
    expect(getAgentHealthState(makeAgent('a1', 'error'), null)).toBe('unhealthy');
  });

  it('still treats an offline agent as unhealthy when its units look fine', () => {
    const agent = { ...makeAgent('a1', 'offline'), components: [{ id: 'c1' }] } as unknown as Agent;
    expect(getAgentHealthState(agent, null)).toBe('unhealthy');
  });
});

describe('getAgentPolicyIdsByInstance', () => {
  const base = {
    selectedAgentPolicyIds: [],
    agentHostsMode: 'new' as const,
  };

  it('uses the agentless policy id as the agent policy id for managed integrations', () => {
    expect(
      getAgentPolicyIdsByInstance({
        ...base,
        deploymentMethod: 'managed_integration',
        instanceIds: ['s3', 'ec2'],
        policyIdsByInstance: { s3: 'pol-a', ec2: 'pol-b' },
      })
    ).toEqual({ s3: ['pol-a'], ec2: ['pol-b'] });
  });

  it('omits instances without a policy (ECF has no Fleet agent)', () => {
    expect(
      getAgentPolicyIdsByInstance({
        ...base,
        deploymentMethod: 'managed_integration',
        instanceIds: ['s3', 'waf_otel'],
        policyIdsByInstance: { s3: 'pol-a' },
      })
    ).toEqual({ s3: ['pol-a'] });
  });

  it('resolves agent-based instances through the new agent policy, not the package policy id', () => {
    expect(
      getAgentPolicyIdsByInstance({
        ...base,
        deploymentMethod: 'agent_based',
        agentPolicyId: 'agent-policy-new',
        instanceIds: ['s3'],
        policyIdsByInstance: { s3: 'package-policy-1' },
      })
    ).toEqual({ s3: ['agent-policy-new'] });
  });

  it('resolves agent-based instances through every selected existing agent policy', () => {
    expect(
      getAgentPolicyIdsByInstance({
        ...base,
        deploymentMethod: 'agent_based',
        agentHostsMode: 'existing',
        agentPolicyId: 'stale-new-policy',
        selectedAgentPolicyIds: ['ap-1', 'ap-2'],
        instanceIds: ['s3'],
        policyIdsByInstance: { s3: 'package-policy-1' },
      })
    ).toEqual({ s3: ['ap-1', 'ap-2'] });
  });

  it('returns no agent policies for a deployed agent-based instance before a policy exists', () => {
    expect(
      getAgentPolicyIdsByInstance({
        ...base,
        deploymentMethod: 'agent_based',
        instanceIds: ['s3'],
        policyIdsByInstance: { s3: 'package-policy-1' },
      })
    ).toEqual({ s3: [] });
  });
});

describe('getApplicableAgents', () => {
  it('matches agents on their policy id', () => {
    const agents = [makeAgent('a1', 'online', 'p1'), makeAgent('a2', 'online', 'p2')];
    expect(getApplicableAgents(agents, ['p1']).map(({ id }) => id)).toEqual(['a1']);
  });

  it('matches version-specific policy ids through the base id', () => {
    const agents = [
      { ...makeAgent('a1', 'online', 'p1#9.2'), policy_base_id: 'p1' } as Agent,
      makeAgent('a2', 'online', 'p1#9.3'),
    ];
    expect(getApplicableAgents(agents, ['p1']).map(({ id }) => id)).toEqual(['a1', 'a2']);
  });

  it('ignores agents with no policy and policy ids with a version suffix on the input', () => {
    const agents = [{ id: 'a1', status: 'online' } as Agent, makeAgent('a2', 'online', 'p1')];
    expect(getApplicableAgents(agents, ['p1#9.2']).map(({ id }) => id)).toEqual(['a2']);
  });

  it.each(['inactive', 'unenrolled', 'unenrolling', 'uninstalled', 'orphaned'] as const)(
    'ignores %s agents on the policy',
    (status) => {
      const agents = [makeAgent('gone', status, 'p1'), makeAgent('live', 'online', 'p1')];
      expect(getApplicableAgents(agents, ['p1']).map(({ id }) => id)).toEqual(['live']);
    }
  );

  it('keeps offline, enrolling and failing agents because they still run the integration', () => {
    const agents = (['offline', 'enrolling', 'error'] as const).map((status) =>
      makeAgent(status, status, 'p1')
    );
    expect(getApplicableAgents(agents, ['p1'])).toHaveLength(3);
  });

  it('returns nothing for no policy ids', () => {
    expect(getApplicableAgents([makeAgent('a1', 'online')], [])).toEqual([]);
  });
});

describe('summarizeInstanceAgents', () => {
  it('is pending with no agent when none have been created yet', () => {
    expect(summarizeInstanceAgents([])).toEqual({
      health: 'pending',
      agent: undefined,
      agentIds: [],
    });
  });

  it('is pending while the only agent is still enrolling', () => {
    const agent = makeAgent('a1', 'enrolling');
    expect(summarizeInstanceAgents([agent])).toEqual({
      health: 'pending',
      agent,
      agentIds: ['a1'],
    });
  });

  it('is healthy with a single online agent', () => {
    const agent = makeAgent('a1', 'online');
    expect(summarizeInstanceAgents([agent]).health).toBe('healthy');
  });

  it('is unhealthy when any agent is unhealthy, and represents the instance with that agent', () => {
    const bad = makeAgent('a2', 'error');
    const summary = summarizeInstanceAgents([makeAgent('a1', 'online'), bad]);
    expect(summary).toMatchObject({ health: 'unhealthy', agent: bad, agentIds: ['a1', 'a2'] });
  });

  it('is healthy when one agent is online and another is still pending', () => {
    const online = makeAgent('a2', 'online');
    const summary = summarizeInstanceAgents([makeAgent('a1', 'enrolling'), online]);
    expect(summary).toMatchObject({ health: 'healthy', agent: online });
  });

  it('ignores an agent failure outside the deployed integration', () => {
    const agent = { ...makeAgent('a1', 'error'), components: [{ id: 'c1' }] } as unknown as Agent;
    expect(summarizeInstanceAgents([agent], { a1: null }).health).toBe('healthy');
  });

  it('is unhealthy when the deployed integration failed on an otherwise online agent', () => {
    const agent = makeAgent('a1', 'online');
    const summary = summarizeInstanceAgents([agent], { a1: 'failed' });
    expect(summary).toMatchObject({ health: 'unhealthy', agent });
  });

  it('treats an offline agent as unhealthy', () => {
    expect(summarizeInstanceAgents([makeAgent('a1', 'offline')]).health).toBe('unhealthy');
  });
});

describe('buildIncomingDataRequests', () => {
  const instance = (overrides: Partial<Parameters<typeof instanceHasData>[0]> = {}) => ({
    agentIds: ['a1'],
    packageName: 'aws',
    packageVersion: '4.0.0',
    isOtel: false,
    ...overrides,
  });

  it('issues one request per package covering every agent', () => {
    const requests = buildIncomingDataRequests([
      instance({ agentIds: ['a1'] }),
      instance({ agentIds: ['a2', 'a1'] }),
    ]);
    expect(requests).toEqual([
      { key: 'aws@4.0.0', pkgName: 'aws', pkgVersion: '4.0.0', agentIds: ['a1', 'a2'] },
    ]);
  });

  it('splits packages and versions into separate requests', () => {
    const requests = buildIncomingDataRequests([
      instance(),
      instance({ packageName: 'aws_securityhub', packageVersion: '1.0.0' }),
      instance({ packageVersion: '4.1.0' }),
    ]);
    expect(requests.map(({ key }) => key)).toEqual([
      'aws@4.0.0',
      'aws_securityhub@1.0.0',
      'aws@4.1.0',
    ]);
  });

  it('issues one request per agent for OTel instances', () => {
    const requests = buildIncomingDataRequests([
      instance({ packageName: 'aws_cloudwatch_input_otel', isOtel: true, agentIds: ['a1', 'a2'] }),
    ]);
    expect(requests).toEqual([
      {
        key: 'aws_cloudwatch_input_otel@4.0.0:a1',
        pkgName: 'aws_cloudwatch_input_otel',
        pkgVersion: '4.0.0',
        agentIds: ['a1'],
      },
      {
        key: 'aws_cloudwatch_input_otel@4.0.0:a2',
        pkgName: 'aws_cloudwatch_input_otel',
        pkgVersion: '4.0.0',
        agentIds: ['a2'],
      },
    ]);
  });

  it('does not duplicate an OTel request when two instances share an agent', () => {
    const otel = instance({ isOtel: true, agentIds: ['a1'] });
    expect(buildIncomingDataRequests([otel, otel])).toHaveLength(1);
  });

  it('issues nothing when no instance has an agent yet', () => {
    expect(buildIncomingDataRequests([instance({ agentIds: [] })])).toEqual([
      { key: 'aws@4.0.0', pkgName: 'aws', pkgVersion: '4.0.0', agentIds: [] },
    ]);
  });
});

describe('instanceHasData', () => {
  const instance = { agentIds: ['a1', 'a2'], packageName: 'aws', packageVersion: '4.0.0' };

  it('is true when any of the instance agents reports data for its package', () => {
    expect(instanceHasData({ ...instance, isOtel: false }, { 'aws@4.0.0': ['a2'] })).toBe(true);
  });

  it('ignores data reported for agents that belong to another instance', () => {
    expect(instanceHasData({ ...instance, isOtel: false }, { 'aws@4.0.0': ['other'] })).toBe(false);
  });

  it('ignores data reported for a different package', () => {
    expect(
      instanceHasData({ ...instance, isOtel: false }, { 'aws_securityhub@4.0.0': ['a1'] })
    ).toBe(false);
  });

  it('is false before any response arrives', () => {
    expect(instanceHasData({ ...instance, isOtel: false }, {})).toBe(false);
  });

  it('reads the per-agent key for OTel instances', () => {
    expect(instanceHasData({ ...instance, isOtel: true }, { 'aws@4.0.0:a2': ['a2'] })).toBe(true);
    expect(instanceHasData({ ...instance, isOtel: true }, { 'aws@4.0.0': ['a1'] })).toBe(false);
  });
});

describe('deriveInstanceChipState', () => {
  const base = {
    contextStatus: 'detecting' as const,
    deployError: false,
    agentHealth: 'healthy' as const,
    hasData: false,
    isTimedOut: false,
  };

  it('stays detecting while a healthy agent has not produced data', () => {
    expect(deriveInstanceChipState(base)).toBe('detecting');
  });

  it('is receiving once data arrives', () => {
    expect(deriveInstanceChipState({ ...base, hasData: true })).toBe('receiving');
  });

  it('is an error for an unhealthy agent, even with data', () => {
    expect(deriveInstanceChipState({ ...base, agentHealth: 'unhealthy', hasData: true })).toBe(
      'error'
    );
  });

  it('is an error for an unhealthy agent after the chip was latched as receiving', () => {
    expect(
      deriveInstanceChipState({
        ...base,
        contextStatus: 'receiving',
        agentHealth: 'unhealthy',
      })
    ).toBe('error');
  });

  it('keeps a deploy error', () => {
    expect(deriveInstanceChipState({ ...base, deployError: true, hasData: true })).toBe('error');
    expect(deriveInstanceChipState({ ...base, contextStatus: 'error' })).toBe('error');
  });

  it('keeps a latched receiving state', () => {
    expect(deriveInstanceChipState({ ...base, contextStatus: 'receiving' })).toBe('receiving');
  });

  it('keeps a pending agent as detecting until it times out', () => {
    expect(deriveInstanceChipState({ ...base, agentHealth: 'pending' })).toBe('detecting');
    expect(deriveInstanceChipState({ ...base, agentHealth: 'pending', isTimedOut: true })).toBe(
      'timeout'
    );
  });

  it('times out when no data arrives', () => {
    expect(deriveInstanceChipState({ ...base, isTimedOut: true })).toBe('timeout');
    expect(
      deriveInstanceChipState({ ...base, contextStatus: 'instantiating', isTimedOut: true })
    ).toBe('timeout');
  });

  it('prefers data over a timeout', () => {
    expect(deriveInstanceChipState({ ...base, hasData: true, isTimedOut: true })).toBe('receiving');
  });

  it('behaves like the pattern-only path for ECF instances (no agent health)', () => {
    const ecf = { ...base, agentHealth: undefined };
    expect(deriveInstanceChipState(ecf)).toBe('detecting');
    expect(deriveInstanceChipState({ ...ecf, hasData: true })).toBe('receiving');
    expect(deriveInstanceChipState({ ...ecf, isTimedOut: true })).toBe('timeout');
  });
});

describe('aggregateInstanceChipStates', () => {
  it.each([
    [[], 'instantiating'],
    [['receiving'], 'receiving'],
    [['receiving', 'receiving'], 'receiving'],
    [['receiving', 'detecting'], 'detecting'],
    [['receiving', 'instantiating'], 'instantiating'],
    [['detecting', 'instantiating'], 'detecting'],
    [['receiving', 'timeout'], 'timeout'],
    [['timeout', 'detecting'], 'timeout'],
    [['receiving', 'error'], 'error'],
    [['error', 'timeout', 'detecting'], 'error'],
  ] as const)('aggregates %j to %s', (states, expected) => {
    expect(aggregateInstanceChipStates([...states])).toBe(expected);
  });
});

describe('pickWorstAgentInstanceId', () => {
  const summary = (health: 'healthy' | 'pending' | 'unhealthy') => ({
    health,
    agentIds: [],
  });

  it('picks the unhealthy instance over pending and healthy ones', () => {
    expect(
      pickWorstAgentInstanceId(
        { a: summary('healthy'), b: summary('unhealthy'), c: summary('pending') },
        ['a', 'b', 'c']
      )
    ).toBe('b');
  });

  it('picks a pending instance over a healthy one', () => {
    expect(
      pickWorstAgentInstanceId({ a: summary('healthy'), b: summary('pending') }, ['a', 'b'])
    ).toBe('b');
  });

  it('picks the first of equally bad instances', () => {
    expect(
      pickWorstAgentInstanceId({ a: summary('unhealthy'), b: summary('unhealthy') }, ['a', 'b'])
    ).toBe('a');
  });

  it('skips instances without an agent summary (ECF)', () => {
    expect(pickWorstAgentInstanceId({ b: summary('healthy') }, ['a', 'b'])).toBe('b');
  });

  it('returns undefined when no instance has an agent', () => {
    expect(pickWorstAgentInstanceId({}, ['a', 'b'])).toBeUndefined();
  });

  it('does not reorder the instance ids it was given', () => {
    const ids = ['a', 'b'];
    pickWorstAgentInstanceId({ a: summary('healthy'), b: summary('unhealthy') }, ids);
    expect(ids).toEqual(['a', 'b']);
  });
});
