/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createIntegrationsTestRendererMock } from '../../../../../../../mock';
import { allowedExperimentalValues } from '../../../../../../../../common/experimental_features';
import { ExperimentalFeaturesService } from '../../../../../services';
import type { PackageInfo } from '../../../../../types';
import { InstallStatus } from '../../../../../types';

import { usePackagePoliciesWithAgentPolicy } from './use_package_policies_with_agent_policy';
import { useAgentlessPolicies } from './use_agentless_policies';
import { PackagePoliciesPage } from './package_policies';

jest.mock('../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../hooks'),
  useConfirmForceInstall: jest.fn(),
  useGetPackageInstallStatus: jest.fn().mockReturnValue(() => ({
    status: 'installed',
    version: '1.0.0',
  })),
  useGetPackageInfoByKeyQuery: jest.fn().mockReturnValue({ data: undefined, isLoading: false }),
  useIsPackagePolicyUpgradable: jest.fn().mockReturnValue({
    isPackagePolicyUpgradable: jest.fn().mockReturnValue(false),
    getPackagePolicyUpgradeReview: jest.fn().mockReturnValue(undefined),
    getKeepPoliciesUpToDate: jest.fn().mockReturnValue(false),
    getUpgradeVersion: jest.fn().mockReturnValue(undefined),
  }),
}));

jest.mock(
  '../../../../../../fleet/sections/agent_policy/create_package_policy_page/single_page_layout/hooks/setup_technology',
  () => ({
    useAgentless: jest.fn().mockReturnValue({
      getAgentlessStatusForPackage: jest.fn().mockReturnValue({ isAgentless: true }),
    }),
  })
);

jest.mock('./use_package_policies_with_agent_policy', () => ({
  usePackagePoliciesWithAgentPolicy: jest.fn().mockReturnValue({
    data: undefined,
    isLoading: false,
    error: null,
    resendRequest: jest.fn(),
  }),
}));

jest.mock('./use_agentless_policies', () => ({
  useAgentlessPolicies: jest.fn().mockReturnValue({
    data: undefined,
    isLoading: false,
    error: null,
    resendRequest: jest.fn(),
  }),
}));

jest.mock('./components/agent_based_table', () => ({
  AgentBasedPackagePoliciesTable: () => null,
}));

const mockAgentlessTable = jest.fn().mockReturnValue(null);
jest.mock('./components/agentless_table', () => ({
  AgentlessPackagePoliciesTable: (props: unknown) => mockAgentlessTable(props),
}));

const packageInfo = {
  name: 'cspm',
  title: 'CSPM',
  version: '1.0.0',
  type: 'integration',
} as PackageInfo;

const getInstallStatusMock = jest.requireMock('../../../../../hooks')
  .useGetPackageInstallStatus as jest.Mock;
const useGetPackageInfoByKeyQueryMock = jest.requireMock('../../../../../hooks')
  .useGetPackageInfoByKeyQuery as jest.Mock;

const renderPage = () => {
  getInstallStatusMock.mockReturnValue(() => ({
    status: InstallStatus.installed,
    version: '1.0.0',
  }));
  const renderer = createIntegrationsTestRendererMock();
  return renderer.render(<PackagePoliciesPage packageInfo={packageInfo} />);
};

// The agent-based table's kuery also contains the substring (as `AND NOT ... supports_agentless:
// true`), so match only the positive filter of the legacy agentless source.
const legacyAgentlessCall = () =>
  jest
    .mocked(usePackagePoliciesWithAgentPolicy)
    .mock.calls.find(
      ([query]) =>
        query.kuery?.includes('supports_agentless: true') && !query.kuery?.includes('NOT')
    );

describe('PackagePoliciesPage agentless table source', () => {
  beforeEach(() => {
    // Re-establish defaults for mocks whose return values are overridden per test
    // (jest.clearAllMocks does not reset mockReturnValue implementations).
    useGetPackageInfoByKeyQueryMock.mockReturnValue({ data: undefined, isLoading: false });
    jest.mocked(useAgentlessPolicies).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      resendRequest: jest.fn(),
    } as unknown as ReturnType<typeof useAgentlessPolicies>);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('sources the agentless table from the managed integrations API when the agentless policies UI is enabled', () => {
    renderPage();

    expect(jest.mocked(useAgentlessPolicies)).toHaveBeenCalledWith(
      expect.objectContaining({ kuery: 'package.name: "cspm"' }),
      { enabled: true }
    );
    const legacyCall = legacyAgentlessCall();
    expect(legacyCall).toBeDefined();
    expect(legacyCall![1]).toEqual({ enabled: false });
  });

  it('surfaces a full package info fetch failure in the agentless table and retries it', () => {
    const manifestError = new Error('registry unavailable');
    const refetchFullPackageInfo = jest.fn();
    useGetPackageInfoByKeyQueryMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: manifestError,
      refetch: refetchFullPackageInfo,
    });
    const resendAgentlessRequest = jest.fn();
    jest.mocked(useAgentlessPolicies).mockReturnValue({
      data: { items: [], total: 3, page: 1, perPage: 10 },
      isLoading: false,
      error: null,
      resendRequest: resendAgentlessRequest,
    } as unknown as ReturnType<typeof useAgentlessPolicies>);

    renderPage();

    const tableProps = mockAgentlessTable.mock.calls.at(-1)![0];
    // The manifest error must reach the table: without it the table would render its
    // "no policies" empty state while the count badge shows the LIST total.
    expect(tableProps.error).toBe(manifestError);

    tableProps.refreshPackagePolicies();
    expect(resendAgentlessRequest).toHaveBeenCalled();
    expect(refetchFullPackageInfo).toHaveBeenCalled();
  });

  it('sources the agentless table from the legacy package-policy API when the agentless policies UI is disabled', () => {
    jest.spyOn(ExperimentalFeaturesService, 'get').mockReturnValue({
      ...allowedExperimentalValues,
      enableAgentlessPoliciesUI: false,
    });

    renderPage();

    expect(jest.mocked(useAgentlessPolicies)).toHaveBeenCalledWith(expect.anything(), {
      enabled: false,
    });
    const legacyCall = legacyAgentlessCall();
    expect(legacyCall).toBeDefined();
    expect(legacyCall![1]).toEqual({ enabled: true });
  });
});
