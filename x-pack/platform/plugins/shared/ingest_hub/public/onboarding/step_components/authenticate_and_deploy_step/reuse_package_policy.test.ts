/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeployGroup } from './deploy_groups';
import { collectExtensionResults, planPolicyReuse } from './reuse_package_policy';

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

describe('planPolicyReuse', () => {
  it('joins the policy of a tracked member of the same group', () => {
    const full = makeGroup('aws', ['elb', 's3']);
    // Managed integrations list only the untracked members to deploy.
    const toDeploy = makeGroup('aws', ['s3']);

    const { createGroups, extensions } = planPolicyReuse([toDeploy], [full], { elb: 'policy-A' });

    expect(createGroups).toEqual([]);
    expect(extensions).toEqual([
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

    const { extensions } = planPolicyReuse([full], [full], { elb: 'policy-A' });

    expect(extensions[0].memberInstanceIds).toEqual(['elb', 's3']);
    expect(extensions[0].resolvedInstanceIds).toEqual(['elb', 's3']);
  });

  it('creates when no member of the group is tracked', () => {
    const group = makeGroup('aws', ['s3']);

    const { createGroups, extensions } = planPolicyReuse([group], [group], {
      other: 'policy-other',
    });

    expect(createGroups).toEqual([group]);
    expect(extensions).toEqual([]);
  });

  it('does not join a policy of another namespace', () => {
    const prod = makeGroup('aws__prod', ['s3'], { namespace: 'prod' });
    const dflt = makeGroup('aws', ['elb']);

    const { createGroups } = planPolicyReuse([prod], [prod, dflt], { elb: 'policy-A' });

    expect(createGroups).toEqual([prod]);
  });

  it('never reuses a policy for a duplicate group', () => {
    const duplicate = makeGroup('s3-copy', ['s3-copy'], { isDuplicateGroup: true });

    const { createGroups, extensions } = planPolicyReuse([duplicate], [duplicate], {
      elb: 'policy-A',
      's3-copy': 'policy-D',
    });

    expect(createGroups).toEqual([duplicate]);
    expect(extensions).toEqual([]);
  });

  it('joins the policy that holds most of the group when an older deployment split it', () => {
    const full = makeGroup('aws', ['a', 'b', 'c', 'new']);
    const toDeploy = makeGroup('aws', ['new']);

    const { extensions } = planPolicyReuse([toDeploy], [full], {
      a: 'policy-1',
      b: 'policy-2',
      c: 'policy-2',
    });

    expect(extensions[0].policyId).toBe('policy-2');
    expect(extensions[0].memberInstanceIds).toEqual(['b', 'c', 'new']);
  });

  it('leaves members tracked on another policy out of the update and its result', () => {
    const full = makeGroup('aws', ['a', 'b', 'c']);

    const { extensions } = planPolicyReuse([full], [full], {
      a: 'policy-1',
      b: 'policy-2',
      c: 'policy-2',
    });

    expect(extensions[0].policyId).toBe('policy-2');
    expect(extensions[0].resolvedInstanceIds).toEqual(['b', 'c']);
  });

  it('splits several groups independently', () => {
    const awsFull = makeGroup('aws', ['elb', 's3']);
    const otherFull = makeGroup('other', ['x']);

    const { createGroups, extensions } = planPolicyReuse(
      [makeGroup('aws', ['s3']), otherFull],
      [awsFull, otherFull],
      { elb: 'policy-A' }
    );

    expect(extensions.map((e) => e.policyId)).toEqual(['policy-A']);
    expect(createGroups.map((g) => g.groupId)).toEqual(['other']);
  });
});

describe('collectExtensionResults', () => {
  const extensions = [
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
    const outcome = collectExtensionResults(extensions, [
      { status: 'fulfilled', value: undefined },
      { status: 'rejected', reason: new Error('boom') },
    ]);

    expect(outcome.policyIdsByInstance).toEqual({ s3: 'policy-A' });
    expect(outcome.failedInstances).toEqual(['x']);
    expect(outcome.errorsByInstance.x).toEqual(expect.any(String));
  });
});
