/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { planMiInitialRun, planMiRetryRun } from './use_mi_deploy';
import type { DeployGroup } from './deploy_groups';
import type { ServiceInstance } from '../service_settings_step/use_service_settings';

function makeInstance(instanceId: string, serviceId: string): ServiceInstance {
  return { instanceId, serviceId, name: serviceId, isDuplicate: false };
}

function makeGroup(instanceId: string, serviceId: string): DeployGroup {
  return {
    groupId: serviceId,
    instanceIds: [instanceId],
    members: [
      { instance: makeInstance(instanceId, serviceId), service: { id: serviceId } as never },
    ],
    isDuplicateGroup: false,
  };
}

describe('planMiInitialRun — mixed dirty+new-target', () => {
  // elb is already deployed (in policyIdsByInstance) so it should be skipped.
  // s3 is a new target with no policy yet and must be in groupsToDeploy.
  const elbGroup = makeGroup('elb', 'elb');
  const s3Group = makeGroup('s3', 's3');

  it('includes only undeployed instances in groupsToDeploy', () => {
    const plan = planMiInitialRun(
      [elbGroup, s3Group],
      { elb: 'receiving' },
      { elb: 'mock-mi-policy-id' },
      undefined,
      []
    );
    expect(plan.groupsToDeploy).toHaveLength(1);
    expect(plan.groupsToDeploy[0].instanceIds).toEqual(['s3']);
  });

  it('sets targets to only the undeployed instance IDs', () => {
    const plan = planMiInitialRun(
      [elbGroup, s3Group],
      { elb: 'receiving' },
      { elb: 'mock-mi-policy-id' },
      undefined,
      []
    );
    expect(plan.targets).toEqual(['s3']);
  });

  it('reports no pending cleanup when no stale policies exist', () => {
    const plan = planMiInitialRun(
      [elbGroup, s3Group],
      { elb: 'receiving' },
      { elb: 'mock-mi-policy-id' },
      undefined,
      []
    );
    expect(plan.hasPendingCleanup).toBe(false);
    expect(plan.effectivePendingCleanup).toEqual({});
  });

  it('includes all instances in groupsToDeploy when none are yet deployed', () => {
    const plan = planMiInitialRun([elbGroup, s3Group], {}, {}, undefined, []);
    expect(plan.groupsToDeploy).toHaveLength(2);
    expect(plan.targets).toEqual(expect.arrayContaining(['elb', 's3']));
  });
});

describe('planMiRetryRun — retry of subset in mixed state', () => {
  // elb has a policy (succeeded); s3 failed and has no policy yet.
  // Only s3 is passed as the retry target.
  const elbGroup = makeGroup('elb', 'elb');
  const s3Group = makeGroup('s3', 's3');

  it('limits groupsToDeploy to retried instances not yet in policyIdsByInstance', () => {
    const plan = planMiRetryRun(
      ['s3'],
      [elbGroup, s3Group],
      { elb: 'mock-mi-policy-id' },
      undefined,
      ['s3']
    );
    expect(plan.groupsToDeploy).toHaveLength(1);
    expect(plan.groupsToDeploy[0].instanceIds).toEqual(['s3']);
  });

  it('reports s3 as a deployed target and elb as remaining failed when elb is not retried', () => {
    // elb is NOT in the retry set but IS in failedInstances — it should appear in remainingFailed.
    const plan = planMiRetryRun(
      ['s3'],
      [elbGroup, s3Group],
      { elb: 'mock-mi-policy-id' },
      undefined,
      ['s3', 'elb']
    );
    expect(plan.deployedTargets).toEqual(['s3']);
    expect(plan.remainingFailed).toEqual(['elb']);
  });
});
