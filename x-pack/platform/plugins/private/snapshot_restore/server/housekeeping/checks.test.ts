/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { failingPolicyCheck, policyWithoutRetentionCheck, staleSnapshotsCheck } from './checks';
import { createContext } from './test_helpers';

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => Date.now() - days * DAY_MS;

const policy = {
  name: '<nightly-{now/d}>',
  schedule: '0 30 1 * * ?',
  repository: 'backups',
  config: { indices: ['*'] },
};

const withPolicies = (policies: Record<string, unknown>) => {
  const { esClient, context } = createContext();
  esClient.slm.getLifecycle.mockResolvedValue(
    policies as unknown as Awaited<ReturnType<typeof esClient.slm.getLifecycle>>
  );
  return context;
};

describe('Snapshot and Restore checks', () => {
  it('reports policies whose last run failed, with the reason', async () => {
    const context = withPolicies({
      failing: {
        policy,
        modified_date_millis: daysAgo(30),
        last_success: { snapshot_name: 'a', time: daysAgo(3) },
        last_failure: {
          snapshot_name: 'b',
          time: daysAgo(1),
          details: JSON.stringify({ type: 'repository_exception', reason: 'cannot write' }),
        },
      },
      recovered: {
        policy,
        modified_date_millis: daysAgo(30),
        last_success: { snapshot_name: 'c', time: daysAgo(1) },
        last_failure: { snapshot_name: 'd', time: daysAgo(3), details: '{}' },
      },
    });

    const findings = await failingPolicyCheck.run(context);
    expect(findings.map(({ resource }) => resource.id)).toEqual(['failing']);
    expect(findings[0].details).toEqual(['The last run failed 1 day ago: cannot write']);
  });

  it('reports policies without a recent successful snapshot, unless they already fail', async () => {
    const context = withPolicies({
      stale: {
        policy,
        modified_date_millis: daysAgo(60),
        last_success: { snapshot_name: 'a', time: daysAgo(10) },
      },
      never: { policy, modified_date_millis: daysAgo(9) },
      recent: {
        policy,
        modified_date_millis: daysAgo(60),
        last_success: { snapshot_name: 'b', time: daysAgo(1) },
      },
      new: { policy, modified_date_millis: daysAgo(1) },
      failing: {
        policy,
        modified_date_millis: daysAgo(60),
        last_failure: { snapshot_name: 'c', time: daysAgo(1), details: '{}' },
      },
    });

    const findings = await staleSnapshotsCheck.run(context);
    expect(findings.map(({ resource, details }) => [resource.id, details])).toEqual([
      ['stale', ['The last successful snapshot is 10 days old.']],
      ['never', ['No successful snapshot since the policy changed 9 days ago.']],
    ]);
  });

  it('suggests a retention for policies without one', async () => {
    const context = withPolicies({
      forever: { policy, modified_date_millis: daysAgo(1) },
      kept: {
        policy: { ...policy, retention: { expire_after: '7d' } },
        modified_date_millis: daysAgo(1),
      },
    });

    const findings = await policyWithoutRetentionCheck.run(context);
    expect(findings.map(({ resource }) => resource.id)).toEqual(['forever']);
    expect(findings[0].fix?.request).toContain('PUT _slm/policy/forever\n');
    expect(JSON.parse(findings[0].fix!.request.split('\n').slice(1).join('\n'))).toEqual({
      ...policy,
      retention: { expire_after: '30d', min_count: 5, max_count: 50 },
    });
  });
});
