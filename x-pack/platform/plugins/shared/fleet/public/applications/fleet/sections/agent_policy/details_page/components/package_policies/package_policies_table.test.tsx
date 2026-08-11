/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../../mock';
import { useIsPackagePolicyUpgradable } from '../../../../../hooks';

import { PackagePoliciesTable } from './package_policies_table';

jest.mock('../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../hooks'),
  useAuthz: jest.fn().mockReturnValue({
    fleet: { readAgentPolicies: true, allAgentPolicies: true },
    integrations: {
      writeIntegrationPolicies: true,
      readIntegrationPolicies: true,
      installPackages: true,
    },
  }),
  useIsPackagePolicyUpgradable: jest.fn(),
  usePermissionCheck: jest.fn().mockReturnValue({ data: { success: true } }),
  useMultipleAgentPolicies: jest.fn().mockReturnValue({ canUseMultipleAgentPolicies: false }),
  useGetOutputs: jest.fn().mockReturnValue({ data: { items: [] }, isLoading: false }),
  useDefaultOutput: jest.fn().mockReturnValue({ output: null }),
}));

jest.mock('../../../../../services', () => ({
  ...jest.requireActual('../../../../../services'),
  ExperimentalFeaturesService: { get: jest.fn().mockReturnValue({}) },
}));

const basePackagePolicy = {
  id: 'pkg1',
  name: 'Package Policy 1',
  namespace: 'default',
  enabled: true,
  inputs: [],
  revision: 1,
  updated_at: '2023-01-01T00:00:00Z',
  updated_by: 'user',
  created_at: '2023-01-01T00:00:00Z',
  created_by: 'user',
  policy_id: 'policy1',
  policy_ids: ['policy1'],
  package: { name: 'system', title: 'System', version: '1.0.0' },
};

const agentPolicy = {
  id: 'policy1',
  name: 'Agent Policy 1',
  namespace: 'default',
  status: 'active' as const,
  is_managed: false,
  is_protected: false,
  updated_at: '2023-01-01T00:00:00Z',
  updated_by: 'user',
  revision: 1,
  monitoring_enabled: [],
};

describe('PackagePoliciesTable', () => {
  const renderTable = (overrides: {
    hasUpgrade?: boolean;
    keepPoliciesUpToDate?: boolean;
    pendingUpgradeReview?: object;
  }) => {
    const { hasUpgrade = false, keepPoliciesUpToDate = false, pendingUpgradeReview } = overrides;

    jest.mocked(useIsPackagePolicyUpgradable).mockReturnValue({
      isPackagePolicyUpgradable: jest.fn().mockReturnValue(hasUpgrade),
      getPackagePolicyUpgradeReview: jest.fn().mockReturnValue(pendingUpgradeReview),
      getKeepPoliciesUpToDate: jest.fn().mockReturnValue(keepPoliciesUpToDate),
      getUpgradeVersion: jest.fn().mockReturnValue('2.0.0'),
      isLoadingPackages: false,
    });

    const renderer = createFleetTestRendererMock();
    return renderer.render(
      <PackagePoliciesTable
        packagePolicies={[basePackagePolicy] as any}
        agentPolicy={agentPolicy as any}
        refreshAgentPolicy={jest.fn()}
      />
    );
  };

  it('renders upgrade button when hasUpgrade is true and keepPoliciesUpToDate is false', async () => {
    const result = renderTable({ hasUpgrade: true, keepPoliciesUpToDate: false });
    await act(async () => {});

    expect(result.getByText('Upgrade')).toBeInTheDocument();
    expect(result.queryByText('Review upgrade')).not.toBeInTheDocument();
    expect(result.queryByText('Resume upgrade')).not.toBeInTheDocument();
  });

  it('renders review upgrade when hasUpgrade is true, keepPoliciesUpToDate is true, and review action is pending', async () => {
    const result = renderTable({
      hasUpgrade: true,
      keepPoliciesUpToDate: true,
      pendingUpgradeReview: {
        target_version: '2.0.0',
        reason: 'deprecated',
        created_at: '2025-01-01T00:00:00Z',
        action: 'pending',
      },
    });
    await act(async () => {});

    expect(result.getByText('Review upgrade')).toBeInTheDocument();
    expect(result.queryByText('Upgrade')).not.toBeInTheDocument();
  });

  it('renders no upgrade UI when hasUpgrade is false', async () => {
    const result = renderTable({ hasUpgrade: false });
    await act(async () => {});

    expect(result.queryByText('Upgrade')).not.toBeInTheDocument();
    expect(result.queryByText('Review upgrade')).not.toBeInTheDocument();
    expect(result.queryByText('Resume upgrade')).not.toBeInTheDocument();
  });
});
