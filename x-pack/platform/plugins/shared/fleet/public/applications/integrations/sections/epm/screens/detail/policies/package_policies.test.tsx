/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';

import { screen } from '@testing-library/react';

import { createIntegrationsTestRendererMock } from '../../../../../../../mock';
import { allowedExperimentalValues } from '../../../../../../../../common/experimental_features';
import { ExperimentalFeaturesService } from '../../../../../services';
import type { PackageInfo } from '../../../../../types';
import { InstallStatus } from '../../../../../types';

import { usePackagePoliciesWithAgentPolicy } from './use_package_policies_with_agent_policy';
import { useAgentlessPolicies } from './use_agentless_policies';
import { PackagePoliciesPage } from './package_policies';

vi.mock('../../../../../hooks', async () => {
      const mocked = {
      ...(await vi.importActual('../../../../../hooks')),
      useConfirmForceInstall: vi.fn(),
      useGetPackageInstallStatus: vi.fn().mockReturnValue(() => ({
        status: 'installed',
        version: '1.0.0',
      })),
      useGetPackageInfoByKeyQuery: vi.fn().mockReturnValue({ data: undefined, isLoading: false }),
      useIsPackagePolicyUpgradable: vi.fn().mockReturnValue({
        isPackagePolicyUpgradable: vi.fn().mockReturnValue(false),
        getPackagePolicyUpgradeReview: vi.fn().mockReturnValue(undefined),
        getKeepPoliciesUpToDate: vi.fn().mockReturnValue(false),
        getUpgradeVersion: vi.fn().mockReturnValue(undefined),
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock(
  '../../../../../../fleet/sections/agent_policy/create_package_policy_page/single_page_layout/hooks/setup_technology',
  () => {
      const mocked = {
        useAgentless: vi.fn().mockReturnValue({
          getAgentlessStatusForPackage: vi.fn().mockReturnValue({ isAgentless: true }),
        }),
      };
      return { ...mocked, default: mocked };
    }
);

vi.mock('./use_package_policies_with_agent_policy', () => {
      const mocked = {
      usePackagePoliciesWithAgentPolicy: vi.fn().mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        resendRequest: vi.fn(),
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./use_agentless_policies', () => {
      const mocked = {
      useAgentlessPolicies: vi.fn().mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        resendRequest: vi.fn(),
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./components/agent_based_table', () => {
      const mocked = {
      AgentBasedPackagePoliciesTable: () => null,
    };
      return { ...mocked, default: mocked };
    });

const mockAgentlessTable = vi.fn().mockReturnValue(null);
vi.mock('./components/agentless_table', () => {
      const mocked = {
      AgentlessPackagePoliciesTable: (props: unknown) => mockAgentlessTable(props),
    };
      return { ...mocked, default: mocked };
    });

const packageInfo = {
  name: 'cspm',
  title: 'CSPM',
  version: '1.0.0',
  type: 'integration',
} as PackageInfo;

const getInstallStatusMock = (await vi.importMock('../../../../../hooks'))
  .useGetPackageInstallStatus as Mock;
const useGetPackageInfoByKeyQueryMock = (await vi.importMock('../../../../../hooks'))
  .useGetPackageInfoByKeyQuery as Mock;

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
  vi
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
    vi.mocked(useAgentlessPolicies).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      resendRequest: vi.fn(),
    } as unknown as ReturnType<typeof useAgentlessPolicies>);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('sources the agentless table from the managed integrations API when the agentless policies UI is enabled', () => {
    renderPage();

    expect(vi.mocked(useAgentlessPolicies)).toHaveBeenCalledWith(
      expect.objectContaining({ kuery: 'package.name: "cspm"' }),
      { enabled: true }
    );
    const legacyCall = legacyAgentlessCall();
    expect(legacyCall).toBeDefined();
    expect(legacyCall![1]).toEqual({ enabled: false });
  });

  it('surfaces a full package info fetch failure in the agentless table and retries it', () => {
    const manifestError = new Error('registry unavailable');
    const refetchFullPackageInfo = vi.fn();
    useGetPackageInfoByKeyQueryMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: manifestError,
      refetch: refetchFullPackageInfo,
    });
    const resendAgentlessRequest = vi.fn();
    vi.mocked(useAgentlessPolicies).mockReturnValue({
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
    vi.spyOn(ExperimentalFeaturesService, 'get').mockReturnValue({
      ...allowedExperimentalValues,
      enableAgentlessPoliciesUI: false,
      // disableAgentlessLegacyAPI forces the UI on, so it must be off to exercise the disabled path.
      disableAgentlessLegacyAPI: false,
    });

    renderPage();

    expect(vi.mocked(useAgentlessPolicies)).toHaveBeenCalledWith(expect.anything(), {
      enabled: false,
    });
    const legacyCall = legacyAgentlessCall();
    expect(legacyCall).toBeDefined();
    expect(legacyCall![1]).toEqual({ enabled: true });
  });
});

describe('PackagePoliciesPage agent-based section visibility', () => {
  beforeEach(() => {
    useGetPackageInfoByKeyQueryMock.mockReturnValue({ data: undefined, isLoading: false });
    vi.mocked(useAgentlessPolicies).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      resendRequest: vi.fn(),
    } as unknown as ReturnType<typeof useAgentlessPolicies>);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('hides the Agent-based section when the agent-based policy count is zero', () => {
    vi.mocked(usePackagePoliciesWithAgentPolicy).mockReturnValue({
      data: { items: [], total: 0, page: 1, perPage: 10 },
      isLoading: false,
      error: null,
      resendRequest: vi.fn(),
    } as unknown as ReturnType<typeof usePackagePoliciesWithAgentPolicy>);

    renderPage();

    expect(screen.queryByText('Agent-based')).toBeNull();
  });

  it('shows the Agent-based section when the agent-based policy count is greater than zero', () => {
    vi.mocked(usePackagePoliciesWithAgentPolicy).mockReturnValue({
      data: { items: [], total: 2, page: 1, perPage: 10 },
      isLoading: false,
      error: null,
      resendRequest: vi.fn(),
    } as unknown as ReturnType<typeof usePackagePoliciesWithAgentPolicy>);

    renderPage();

    expect(screen.getByText('Agent-based')).toBeDefined();
  });

  it('hides the Agent-based section while the agent-based data is still loading (data is undefined)', () => {
    vi.mocked(usePackagePoliciesWithAgentPolicy).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      resendRequest: vi.fn(),
    } as unknown as ReturnType<typeof usePackagePoliciesWithAgentPolicy>);

    renderPage();

    expect(screen.queryByText('Agent-based')).toBeNull();
  });
});
