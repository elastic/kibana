/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InactivityTimeouts } from './build_status_runtime_field';
import { _buildStatusRuntimeField } from './build_status_runtime_field';

// default `script.max_size_in_bytes` in Elasticsearch, only applies to the script source (not params)
const ES_MAX_SCRIPT_SIZE_IN_BYTES = 65535;

describe('buildStatusRuntimeField', () => {
  const now = 1234567890123;
  const offlineCutoff = 1234567530123;
  beforeAll(() => {
    global.Date.now = jest.fn(() => now);
  });

  it('should build a painless runtime field with the cutoffs as params', () => {
    const inactivityTimeouts: InactivityTimeouts = [
      { inactivityTimeout: 60, policyIds: ['policy-1', 'policy-2'] },
    ];

    const runtimeField = _buildStatusRuntimeField({ inactivityTimeouts });

    expect(runtimeField.status.type).toBe('keyword');
    expect(runtimeField.status.script.lang).toBe('painless');
    expect(runtimeField.status.script.params).toEqual({
      inactivityCutoffs: { 'policy-1': now - 60_000, 'policy-2': now - 60_000 },
      offlineCutoff,
    });
  });

  it('should have empty inactivity cutoffs if there are no inactivity timeouts', () => {
    const { params } = _buildStatusRuntimeField({ inactivityTimeouts: [] }).status.script;

    expect(params).toEqual({ inactivityCutoffs: {}, offlineCutoff });
  });

  it('should set a cutoff per policy for multiple inactivity timeouts', () => {
    const inactivityTimeouts: InactivityTimeouts = [
      { inactivityTimeout: 60, policyIds: ['policy-1', 'policy-2'] },
      { inactivityTimeout: 120, policyIds: ['policy-3'] },
    ];

    const { params } = _buildStatusRuntimeField({ inactivityTimeouts }).status.script;

    expect(params.inactivityCutoffs).toEqual({
      'policy-1': now - 60_000,
      'policy-2': now - 60_000,
      'policy-3': now - 120_000,
    });
  });

  it('should keep the shortest timeout if a policy is in multiple inactivity timeouts', () => {
    const inactivityTimeouts: InactivityTimeouts = [
      { inactivityTimeout: 120, policyIds: ['policy-1'] },
      { inactivityTimeout: 60, policyIds: ['policy-1'] },
    ];

    const { params } = _buildStatusRuntimeField({ inactivityTimeouts }).status.script;

    expect(params.inactivityCutoffs).toEqual({ 'policy-1': now - 60_000 });
  });

  it('should keep policy ids as data, not as part of the script', () => {
    const inactivityTimeouts: InactivityTimeouts = [
      { inactivityTimeout: 60, policyIds: [`it's a "weird-id" \\ #1`] },
    ];

    const { source, params } = _buildStatusRuntimeField({ inactivityTimeouts }).status.script;

    expect(source).not.toContain('weird-id');
    expect(params.inactivityCutoffs).toEqual({ [`it's a "weird-id" \\ #1`]: now - 60_000 });
  });

  it('should use the same source whatever the inactivity timeouts and the time are', () => {
    const withoutTimeouts = _buildStatusRuntimeField({ inactivityTimeouts: [] }).status.script;

    (global.Date.now as jest.Mock).mockReturnValueOnce(now + 1000);
    const withTimeouts = _buildStatusRuntimeField({
      inactivityTimeouts: [{ inactivityTimeout: 300, policyIds: ['policy-1'] }],
    }).status.script;

    expect(withTimeouts.source).toBe(withoutTimeouts.source);
    expect(withTimeouts.params).not.toEqual(withoutTimeouts.params);
  });

  it('should keep the source constant with more agent policies than the old limit', () => {
    // 750 was the previous limit, 2000 is past the 64KB script size limit when inlined in the source
    const policyIds = new Array(2000).fill(0).map((_, i) => `a-long-agent-policy-id-${i}`);
    const inactivityTimeouts: InactivityTimeouts = [{ inactivityTimeout: 300, policyIds }];

    const { source, params } = _buildStatusRuntimeField({ inactivityTimeouts }).status.script;

    expect(source).toBe(_buildStatusRuntimeField({ inactivityTimeouts: [] }).status.script.source);
    expect(source.length).toBeLessThan(ES_MAX_SCRIPT_SIZE_IN_BYTES / 10);
    expect(Object.keys(params.inactivityCutoffs)).toHaveLength(2000);
    expect(params.inactivityCutoffs['a-long-agent-policy-id-1999']).toBe(now - 300_000);
  });

  it('should emit inactive from the cutoff of the base policy id, with a policy_id fallback', () => {
    const { source } = _buildStatusRuntimeField({ inactivityTimeouts: [] }).status.script;

    // agents reassigned to a version-specific variant, e.g. 'policy-1#sentinel', carry the base id
    // in policy_base_id; agents enrolled before that field existed only have the base policy_id
    expect(source).toContain(
      "String agentPolicyBaseId = doc.containsKey('policy_base_id') && doc['policy_base_id'].size() > 0 ? doc['policy_base_id'].value : ( doc.containsKey('policy_id') && doc['policy_id'].size() > 0 ? doc['policy_id'].value : '' );"
    );
    expect(source).toContain(
      'def inactivityCutoff = agentPolicyBaseId.length() > 0 ? params.inactivityCutoffs.get(agentPolicyBaseId) : null;'
    );
    expect(source).toContain(
      "else if (inactivityCutoff != null && lastCheckinMillis > 0 && lastCheckinMillis < ((Number) inactivityCutoff).longValue()) {emit('inactive');}"
    );
  });

  it('should use the offline cutoff param for offline agents', () => {
    const { source } = _buildStatusRuntimeField({ inactivityTimeouts: [] }).status.script;

    expect(source).toContain('lastCheckinMillis < params.offlineCutoff');
    expect(source).not.toMatch(/\d{13}L/);
  });

  it('should emit all the statuses in the same order as before', () => {
    const { source } = _buildStatusRuntimeField({ inactivityTimeouts: [] }).status.script;

    const emitted = [...source.matchAll(/emit\('(\w+)'\)/g)].map((m) => m[1]);

    expect(emitted).toEqual([
      'unenrolled',
      'inactive',
      'uninstalled',
      'orphaned',
      'offline',
      'offline',
      'updating',
      'enrolling',
      'unenrolling',
      'error',
      'degraded',
      'online',
    ]);
  });

  it('should prefix the fields with the path prefix', () => {
    const { source } = _buildStatusRuntimeField({
      inactivityTimeouts: [],
      pathPrefix: 'my.prefix.',
    }).status.script;

    expect(source).toContain(
      "String agentPolicyBaseId = doc.containsKey('my.prefix.policy_base_id') && doc['my.prefix.policy_base_id'].size() > 0 ? doc['my.prefix.policy_base_id'].value : ( doc.containsKey('my.prefix.policy_id') && doc['my.prefix.policy_id'].size() > 0 ? doc['my.prefix.policy_id'].value : '' );"
    );
    expect(source).toContain("doc['my.prefix.last_checkin'].size() > 0");
    expect(source).toContain("doc['my.prefix.active'].size() > 0");
    expect(source).not.toContain("doc['last_checkin']");
  });

  it('should build the same runtime field if path ends with. or not', () => {
    const inactivityTimeouts: InactivityTimeouts = [];
    const runtimeFieldWithDot = _buildStatusRuntimeField({
      inactivityTimeouts,
      pathPrefix: 'my.prefix.',
    });
    const runtimeFieldNoDot = _buildStatusRuntimeField({
      inactivityTimeouts,
      pathPrefix: 'my.prefix',
    });
    expect(runtimeFieldWithDot).toEqual(runtimeFieldNoDot);
  });
});
