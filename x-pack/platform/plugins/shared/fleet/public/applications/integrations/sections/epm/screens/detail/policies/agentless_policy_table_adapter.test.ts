/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInfo } from '../../../../../types';
import type { AgentlessPolicy } from '../../../../../../../../common/types/models/agentless_policy';
import { agentlessPolicyToPackagePolicy } from '../../../../../../../../common/services';

import { agentlessPolicyToTableItem } from './agentless_policy_table_adapter';

jest.mock('../../../../../../../../common/services', () => ({
  agentlessPolicyToPackagePolicy: jest.fn(),
}));

const mockAgentlessPolicyToPackagePolicy = agentlessPolicyToPackagePolicy as jest.MockedFunction<
  typeof agentlessPolicyToPackagePolicy
>;

describe('agentlessPolicyToTableItem', () => {
  const packageInfo = { name: 'nginx', version: '1.0.0' } as PackageInfo;

  const agentlessPolicy = {
    id: 'agentless-1',
    name: 'Nginx agentless',
    namespace: 'default',
    package: { name: 'nginx', title: 'Nginx', version: '1.0.0' },
    inputs: {},
    var_group_selections: {},
    created_at: '2026-01-01T00:00:00.000Z',
    created_by: 'creator',
    updated_at: '2026-02-02T00:00:00.000Z',
    updated_by: 'updater',
  } as unknown as AgentlessPolicy;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAgentlessPolicyToPackagePolicy.mockReturnValue({
      name: 'Nginx agentless',
      namespace: 'default',
      package: { name: 'nginx', title: 'Nginx', version: '1.0.0' },
      inputs: [],
      policy_ids: [],
      enabled: true,
    } as any);
  });

  it('expands the policy through agentlessPolicyToPackagePolicy with the package info', () => {
    agentlessPolicyToTableItem(agentlessPolicy, packageInfo);

    expect(mockAgentlessPolicyToPackagePolicy).toHaveBeenCalledWith(agentlessPolicy, packageInfo);
  });

  it('enriches the package policy with the agentless identifiers and timestamps', () => {
    const { packagePolicy } = agentlessPolicyToTableItem(agentlessPolicy, packageInfo);

    expect(packagePolicy.id).toBe('agentless-1');
    expect(packagePolicy.created_at).toBe('2026-01-01T00:00:00.000Z');
    expect(packagePolicy.created_by).toBe('creator');
    expect(packagePolicy.updated_at).toBe('2026-02-02T00:00:00.000Z');
    expect(packagePolicy.updated_by).toBe('updater');
    expect(packagePolicy.name).toBe('Nginx agentless');
    expect(packagePolicy.package?.name).toBe('nginx');
  });

  it('sets policy_ids to the agentless id (agent-policy id == policy id by server design)', () => {
    const { packagePolicy } = agentlessPolicyToTableItem(agentlessPolicy, packageInfo);

    expect(packagePolicy.policy_ids).toEqual(['agentless-1']);
  });

  it('synthesizes a minimal agentless agent policy keyed by the agentless id', () => {
    const { agentPolicies } = agentlessPolicyToTableItem(agentlessPolicy, packageInfo);

    // supports_agentless drives shared row consumers: without it the actions menu offers
    // "Add agent" and the delete modal shows the agent-based wording on agentless rows.
    expect(agentPolicies).toEqual([
      { id: 'agentless-1', name: 'Nginx agentless', supports_agentless: true },
    ]);
  });

  it('degrades to a minimal row (no throw) when input expansion fails', () => {
    // e.g. the policy references a field absent from the loaded manifest, or predates the version.
    mockAgentlessPolicyToPackagePolicy.mockImplementation(() => {
      throw new Error('Input not found: nginx-foo');
    });

    const { packagePolicy, agentPolicies } = agentlessPolicyToTableItem(
      agentlessPolicy,
      packageInfo
    );

    // A single bad policy must never crash the whole deployments table.
    expect(packagePolicy.id).toBe('agentless-1');
    expect(packagePolicy.name).toBe('Nginx agentless');
    expect(packagePolicy.package?.version).toBe('1.0.0');
    expect(packagePolicy.inputs).toEqual([]);
    expect(packagePolicy.policy_ids).toEqual(['agentless-1']);
    expect(packagePolicy.updated_at).toBe('2026-02-02T00:00:00.000Z');
    expect(agentPolicies).toEqual([
      { id: 'agentless-1', name: 'Nginx agentless', supports_agentless: true },
    ]);
  });
});
