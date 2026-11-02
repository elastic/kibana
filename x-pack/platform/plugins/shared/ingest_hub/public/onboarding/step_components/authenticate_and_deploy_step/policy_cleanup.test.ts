/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computePolicyCleanupOps } from './policy_cleanup';

// ── computePolicyCleanupOps ───────────────────────────────────────────────────

describe('computePolicyCleanupOps', () => {
  it('returns empty ops when pendingCleanupPolicyIds is empty', () => {
    expect(computePolicyCleanupOps({}, { 'inst-a': 'policy-1' })).toEqual({
      toDelete: [],
      toUpdate: [],
    });
  });

  it('puts a policy in toDelete when all its instances were removed', () => {
    const ops = computePolicyCleanupOps({ 'inst-a': 'policy-1' }, {});
    expect(ops.toDelete).toEqual(['policy-1']);
    expect(ops.toUpdate).toEqual([]);
  });

  it('puts a policy in toUpdate with correct survivingInstanceIds when some instances survive', () => {
    const ops = computePolicyCleanupOps(
      { 'inst-a': 'policy-1' }, // inst-a removed
      { 'inst-b': 'policy-1' } // inst-b still deployed
    );
    expect(ops.toDelete).toEqual([]);
    expect(ops.toUpdate).toEqual([{ policyId: 'policy-1', survivingInstanceIds: ['inst-b'] }]);
  });

  it('correctly classifies multiple policies — one fully removed, one partially', () => {
    const ops = computePolicyCleanupOps(
      { 'inst-a': 'policy-delete', 'inst-c': 'policy-update' },
      { 'inst-d': 'policy-update' }
    );
    expect(ops.toDelete).toContain('policy-delete');
    expect(ops.toDelete).not.toContain('policy-update');
    expect(ops.toUpdate).toEqual([{ policyId: 'policy-update', survivingInstanceIds: ['inst-d'] }]);
  });

  it('de-dups: same policyId across multiple removed instances → one entry in toDelete', () => {
    const ops = computePolicyCleanupOps({ 'inst-a': 'policy-1', 'inst-b': 'policy-1' }, {});
    expect(ops.toDelete).toHaveLength(1);
    expect(ops.toDelete).toEqual(['policy-1']);
  });

  it('de-dups: same policyId across multiple removed instances → one entry in toUpdate', () => {
    const ops = computePolicyCleanupOps(
      { 'inst-a': 'policy-1', 'inst-b': 'policy-1' },
      { 'inst-c': 'policy-1' }
    );
    expect(ops.toUpdate).toHaveLength(1);
    expect(ops.toUpdate[0].policyId).toBe('policy-1');
    expect(ops.toUpdate[0].survivingInstanceIds).toEqual(['inst-c']);
  });

  it('ignores surviving instances whose policy is not in pending', () => {
    // inst-b maps to policy-2 which has no removed instances → not in policyMap
    const ops = computePolicyCleanupOps({ 'inst-a': 'policy-1' }, { 'inst-b': 'policy-2' });
    expect(ops.toDelete).toEqual(['policy-1']);
    expect(ops.toUpdate).toEqual([]);
  });

  it('deletes policy when currentPolicyIdsByInstance still has the removed instance (live-stale path)', () => {
    // When deselecting from Step 1, removeDeployInstance is never called, so
    // policyIdsByInstance is NOT pre-pruned. The removed instance appears in both
    // pendingCleanupPolicyIds AND currentPolicyIdsByInstance. Must not count it as a survivor.
    const ops = computePolicyCleanupOps(
      { security_hub: 'policy-1' }, // pending removal
      { security_hub: 'policy-1' } // still in policyIdsByInstance (not pre-pruned)
    );
    expect(ops.toDelete).toEqual(['policy-1']);
    expect(ops.toUpdate).toEqual([]);
  });

  it('correctly handles partial survival when currentPolicyIdsByInstance includes the removed instance', () => {
    // Similar to live-stale path but another instance genuinely survives.
    const ops = computePolicyCleanupOps(
      { vpcflow: 'policy-1' },
      { vpcflow: 'policy-1', guardduty: 'policy-1' }
    );
    expect(ops.toDelete).toEqual([]);
    expect(ops.toUpdate).toEqual([{ policyId: 'policy-1', survivingInstanceIds: ['guardduty'] }]);
  });
});
