/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OsqueryAgentPolicy } from './types';
import { selectAgentPolicies } from './use_agent_policies';

jest.mock('../common/lib/kibana');

const policy = (id: string, ownership: Partial<OsqueryAgentPolicy> = {}): OsqueryAgentPolicy => ({
  id,
  name: `Policy ${id}`,
  namespace: 'default',
  status: 'active',
  is_managed: false,
  is_protected: false,
  revision: 1,
  updated_at: '2026-01-01T00:00:00.000Z',
  updated_by: 'test',
  ...ownership,
});

describe('selectAgentPolicies', () => {
  it('groups shared integrations and preserves the existing policy selections', () => {
    const shared = { package_policy_id: 'pp1', package_policy_name: 'Shared integration' };
    const response = [policy('A', shared), policy('B', shared), policy('C', shared)];
    const selection = selectAgentPolicies(response);

    expect(selection.agentPolicies).toBe(response);
    expect(selection.agentPoliciesById).toEqual({ A: response[0], B: response[1], C: response[2] });
    expect(selection.agentPoliciesById.A).toBe(response[0]);
    expect(selection.groupsByPackagePolicyId).toEqual({
      pp1: { id: 'pp1', name: 'Shared integration', policyIds: ['A', 'B', 'C'] },
    });
    expect(selection.groupIdByPolicyId).toEqual({ A: 'pp1', B: 'pp1', C: 'pp1' });
  });

  it('leaves unshared integrations as individual policies', () => {
    const selection = selectAgentPolicies([
      policy('A', { osquery_package_policies: [{ id: 'pp1', name: 'Dedicated A' }] }),
      policy('B', { package_policy_id: 'pp2', package_policy_name: 'Dedicated B' }),
    ]);

    expect(selection.groupsByPackagePolicyId).toEqual({});
    expect(selection.groupIdByPolicyId).toEqual({});
    expect(selection.agentPolicies).toHaveLength(2);
  });

  it('keeps policies with missing ownership fields without grouping them', () => {
    const selection = selectAgentPolicies([
      policy('A'),
      policy('B', { package_policy_name: 'No integration id' }),
      policy('C', { osquery_package_policies: [] }),
    ]);

    expect(selection.groupsByPackagePolicyId).toEqual({});
    expect(selection.groupIdByPolicyId).toEqual({});
    expect(Object.keys(selection.agentPoliciesById)).toEqual(['A', 'B', 'C']);
  });

  it('uses the integration id when the integration name is missing', () => {
    const selection = selectAgentPolicies([
      policy('A', { package_policy_id: 'pp1' }),
      policy('B', { package_policy_id: 'pp1' }),
    ]);

    expect(selection.groupsByPackagePolicyId).toEqual({
      pp1: { id: 'pp1', name: 'pp1', policyIds: ['A', 'B'] },
    });
  });

  it('does not merge overlapping integrations and leaves a multi-integration policy ungrouped', () => {
    const pp1 = { id: 'pp1', name: 'Integration one' };
    const pp2 = { id: 'pp2', name: 'Integration two' };
    // Server shape: `package_policy_id` is only set with exactly one Osquery integration.
    const single = (integration: typeof pp1) => ({
      package_policy_id: integration.id,
      package_policy_name: integration.name,
      osquery_package_policies: [integration],
    });
    const response = [
      policy('C', single(pp2)),
      policy('B', single(pp1)),
      policy('E', single(pp1)),
      policy('A', { osquery_package_policies: [pp2, pp1] }),
    ];

    const selection = selectAgentPolicies(response);

    expect(selection.groupsByPackagePolicyId).toEqual({
      pp1: { id: 'pp1', name: 'Integration one', policyIds: ['B', 'E'] },
    });
    expect(selection.groupIdByPolicyId).toEqual({ B: 'pp1', E: 'pp1' });
    expect(selectAgentPolicies([...response].reverse()).groupsByPackagePolicyId).toEqual(
      selection.groupsByPackagePolicyId
    );
  });

  it('returns empty selections for an empty response', () => {
    expect(selectAgentPolicies([])).toEqual({
      agentPolicies: [],
      agentPoliciesById: {},
      groupsByPackagePolicyId: {},
      groupIdByPolicyId: {},
    });
  });
});
