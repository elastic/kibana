/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeployGroup } from './deploy_groups';
import {
  collectPolicyUpdateResults,
  mergePolicyUpdateResults,
  addedInstanceIdsByPolicy,
  planPolicyUpdates,
  splitPendingPolicyUpdates,
} from './plan_policy_updates';
import type { PolicyUpdatePlanItem } from './plan_policy_updates';

function makeGroup(
  groupId: string,
  instanceIds: string[],
  overrides: Partial<DeployGroup> = {}
): DeployGroup {
  return {
    groupId,
    instanceIds,
    members: [],
    isDuplicateGroup: false,
    namespace: '',
    ...overrides,
  };
}

describe('planPolicyUpdates', () => {
  it('joins the policy of a tracked member of the same group', () => {
    const full = makeGroup('aws', ['elb', 's3']);
    // Managed integrations list only the untracked members to deploy.
    const toDeploy = makeGroup('aws', ['s3']);

    const { createGroups, policyUpdates } = planPolicyUpdates([toDeploy], [full], {
      elb: 'policy-A',
    });

    expect(createGroups).toEqual([]);
    expect(policyUpdates).toEqual([
      {
        policyId: 'policy-A',
        group: toDeploy,
        memberInstanceIds: ['elb', 's3'],
        resolvedInstanceIds: ['s3'],
      },
    ]);
  });

  it('keeps already-tracked members in the update when the whole group is passed (agent-based)', () => {
    const full = makeGroup('aws', ['elb', 's3']);

    const { policyUpdates } = planPolicyUpdates([full], [full], { elb: 'policy-A' });

    expect(policyUpdates[0].memberInstanceIds).toEqual(['elb', 's3']);
    expect(policyUpdates[0].resolvedInstanceIds).toEqual(['elb', 's3']);
  });

  it('creates when no member of the group is tracked', () => {
    const group = makeGroup('aws', ['s3']);

    const { createGroups, policyUpdates } = planPolicyUpdates([group], [group], {
      other: 'policy-other',
    });

    expect(createGroups).toEqual([group]);
    expect(policyUpdates).toEqual([]);
  });

  it('does not join a policy of another namespace', () => {
    const prod = makeGroup('aws__prod', ['s3'], { namespace: 'prod' });
    const dflt = makeGroup('aws', ['elb']);

    const { createGroups } = planPolicyUpdates([prod], [prod, dflt], { elb: 'policy-A' });

    expect(createGroups).toEqual([prod]);
  });

  it('always creates a policy for a duplicate group', () => {
    const duplicate = makeGroup('s3-copy', ['s3-copy'], { isDuplicateGroup: true });

    const { createGroups, policyUpdates } = planPolicyUpdates([duplicate], [duplicate], {
      elb: 'policy-A',
      's3-copy': 'policy-D',
    });

    expect(createGroups).toEqual([duplicate]);
    expect(policyUpdates).toEqual([]);
  });

  it('joins the policy that holds most of the group when an older deployment split it', () => {
    const full = makeGroup('aws', ['a', 'b', 'c', 'new']);
    const toDeploy = makeGroup('aws', ['new']);

    const { policyUpdates } = planPolicyUpdates([toDeploy], [full], {
      a: 'policy-1',
      b: 'policy-2',
      c: 'policy-2',
    });

    expect(policyUpdates[0].policyId).toBe('policy-2');
    expect(policyUpdates[0].memberInstanceIds).toEqual(['b', 'c', 'new']);
  });

  it('leaves members tracked on another policy out of the update and its result', () => {
    const full = makeGroup('aws', ['a', 'b', 'c']);

    const { policyUpdates } = planPolicyUpdates([full], [full], {
      a: 'policy-1',
      b: 'policy-2',
      c: 'policy-2',
    });

    expect(policyUpdates[0].policyId).toBe('policy-2');
    expect(policyUpdates[0].resolvedInstanceIds).toEqual(['b', 'c']);
  });

  it('splits several groups independently', () => {
    const awsFull = makeGroup('aws', ['elb', 's3']);
    const otherFull = makeGroup('other', ['x']);

    const { createGroups, policyUpdates } = planPolicyUpdates(
      [makeGroup('aws', ['s3']), otherFull],
      [awsFull, otherFull],
      { elb: 'policy-A' }
    );

    expect(policyUpdates.map((e) => e.policyId)).toEqual(['policy-A']);
    expect(createGroups.map((g) => g.groupId)).toEqual(['other']);
  });
});

describe('collectPolicyUpdateResults', () => {
  const policyUpdates = [
    {
      policyId: 'policy-A',
      group: makeGroup('aws', ['s3']),
      memberInstanceIds: ['elb', 's3'],
      resolvedInstanceIds: ['s3'],
    },
    {
      policyId: 'policy-B',
      group: makeGroup('other', ['x']),
      memberInstanceIds: ['x'],
      resolvedInstanceIds: ['x'],
    },
  ];

  it('maps resolved instances to the updated policy and fails the ones whose update failed', () => {
    const outcome = collectPolicyUpdateResults(policyUpdates, [
      { status: 'fulfilled', value: undefined },
      { status: 'rejected', reason: new Error('boom') },
    ]);

    expect(outcome.policyIdsByInstance).toEqual({ s3: 'policy-A' });
    expect(outcome.failedInstances).toEqual(['x']);
    expect(outcome.errorsByInstance.x).toEqual(expect.any(String));
  });
});

describe('addedInstanceIdsByPolicy', () => {
  const policyUpdate = (
    policyId: string,
    resolvedInstanceIds: string[],
    memberInstanceIds = resolvedInstanceIds
  ): PolicyUpdatePlanItem => ({
    policyId,
    group: makeGroup('aws', resolvedInstanceIds),
    memberInstanceIds,
    resolvedInstanceIds,
  });

  it('lists the instances that are not tracked yet, per policy', () => {
    const result = addedInstanceIdsByPolicy(
      [policyUpdate('policy-A', ['elb', 's3']), policyUpdate('policy-B', ['x'])],
      { elb: 'policy-A' }
    );

    expect(result).toEqual({ 'policy-A': ['s3'], 'policy-B': ['x'] });
  });

  it('leaves out a policy whose instances are all tracked already', () => {
    expect(
      addedInstanceIdsByPolicy([policyUpdate('policy-A', ['elb'])], { elb: 'policy-A' })
    ).toEqual({});
  });

  it('joins the new instances of several policyUpdates of the same policy', () => {
    const result = addedInstanceIdsByPolicy(
      [policyUpdate('policy-A', ['a']), policyUpdate('policy-A', ['b'])],
      {}
    );

    expect(result).toEqual({ 'policy-A': ['a', 'b'] });
  });
});

describe('splitPendingPolicyUpdates and mergePolicyUpdateResults', () => {
  const policyUpdateFor = (policyId: string, groupId = 'aws'): PolicyUpdatePlanItem => ({
    policyId,
    group: makeGroup(groupId, [policyId]),
    memberInstanceIds: [policyId],
    resolvedInstanceIds: [policyId],
  });
  const ok = { status: 'fulfilled' as const, value: undefined };

  it('leaves out the policies an earlier phase wrote and remembers where the rest sit', () => {
    const [written, failed, fine] = ['written', 'failed', 'ok'].map((id) => policyUpdateFor(id));

    const split = splitPendingPolicyUpdates([written, failed, fine], new Set(['written']));

    expect(split.pending).toEqual([failed, fine]);
    expect(split.pendingIndexes).toEqual([1, 2]);
    expect(split.all).toEqual([written, failed, fine]);
  });

  it('keeps the attempted results in place and treats policies written earlier as succeeded', () => {
    const [written, failed, fine] = ['written', 'failed', 'ok'].map((id) => policyUpdateFor(id));
    const reason = new Error('boom');
    const split = splitPendingPolicyUpdates([written, failed, fine], new Set(['written']));

    const merged = mergePolicyUpdateResults(split, [{ status: 'rejected', reason }, ok]);

    expect(merged).toEqual([ok, { status: 'rejected', reason }, ok]);
  });

  it('returns only successes when every policy was written earlier', () => {
    const split = splitPendingPolicyUpdates(
      [policyUpdateFor('a'), policyUpdateFor('b')],
      new Set(['a', 'b'])
    );

    expect(mergePolicyUpdateResults(split, []).map((r) => r.status)).toEqual([
      'fulfilled',
      'fulfilled',
    ]);
  });

  it('maps results by position, also for updates that share a policy (split policies)', () => {
    const first = policyUpdateFor('same', 'aws__a');
    const second = policyUpdateFor('same', 'aws__b');
    const reason = new Error('second failed');
    const split = splitPendingPolicyUpdates([first, second], new Set());

    const merged = mergePolicyUpdateResults(split, [ok, { status: 'rejected', reason }]);

    expect(merged).toEqual([ok, { status: 'rejected', reason }]);
  });

  it('does not report updates that never ran as succeeded: results that do not line up throw', () => {
    const split = splitPendingPolicyUpdates(
      [policyUpdateFor('a'), policyUpdateFor('b')],
      new Set()
    );

    expect(() => mergePolicyUpdateResults(split, [ok])).toThrow(/Expected 2 policy update results/);
    expect(() => mergePolicyUpdateResults(split, [ok, ok, ok])).toThrow(
      /Expected 2 policy update results/
    );
  });
});
