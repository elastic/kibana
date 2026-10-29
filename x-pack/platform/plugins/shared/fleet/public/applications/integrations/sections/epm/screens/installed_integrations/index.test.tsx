/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { createIntegrationsTestRendererMock } from '../../../../../../mock';
import { useGetPackageInfoByKeyQuery } from '../../../../../../hooks';

import { useViewOnboardingInstances } from './hooks/use_url_filters';
import { useOnboardingInstances } from './hooks/use_onboarding_instances';
import { useInstalledIntegrations } from './hooks/use_installed_integrations';
import type { PanelPackage } from './types';

import { InstalledIntegrationsPage } from '.';

jest.mock('../../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../../hooks'),
  useUrlPagination: jest.fn(() => ({
    pagination: { currentPage: 1, pageSize: 20 },
    pageSizeOptions: [20],
    setPagination: jest.fn(),
  })),
  useGetPackageInfoByKeyQuery: jest.fn(),
}));
jest.mock('./hooks/use_url_filters', () => ({
  useUrlFilters: jest.fn(() => ({})),
  useViewPolicies: jest.fn(() => ({ selectedPackageViewPolicies: undefined })),
  useViewOnboardingInstances: jest.fn(),
}));
jest.mock('./hooks/use_onboarding_instances', () => ({ useOnboardingInstances: jest.fn() }));
jest.mock('./hooks/use_installed_integrations', () => ({ useInstalledIntegrations: jest.fn() }));
jest.mock('./hooks/use_installed_integrations_actions', () => ({
  useInstalledIntegrationsActions: jest.fn(() => ({
    upgradingIntegrations: [],
    uninstallingIntegrations: [],
    rollingbackIntegrations: [],
  })),
}));
jest.mock('./components/installed_integrations_table', () => ({
  InstalledIntegrationsTable: () => <div data-test-subj="installedIntegrationsTable" />,
}));
jest.mock('./components/installed_integrations_search_bar', () => ({
  InstalledIntegrationsSearchBar: () => null,
}));
jest.mock('./components/package_policies_panel', () => ({ PackagePoliciesPanel: () => null }));
jest.mock('./components/onboarding_instances_panel', () => ({
  OnboardingInstancesPanel: ({
    installedPackage,
    onboardingInstances,
    isLoading,
  }: {
    installedPackage: PanelPackage;
    onboardingInstances: unknown[];
    isLoading?: boolean;
  }) => (
    <div data-test-subj="instancesPanel">
      {installedPackage.title} ({onboardingInstances.length}){isLoading ? ' loading' : ''}
    </div>
  ),
}));

const mockUseViewOnboardingInstances = useViewOnboardingInstances as jest.Mock;
const mockUseOnboardingInstances = useOnboardingInstances as jest.Mock;
const mockUseInstalledIntegrations = useInstalledIntegrations as jest.Mock;
const mockUseGetPackageInfo = useGetPackageInfoByKeyQuery as jest.Mock;

const installedPackage = (name: string, title: string) => ({
  name,
  title,
  version: '1.0.0',
  icons: [],
  ui: { installation_status: 'installed' },
});

describe('InstalledIntegrationsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseViewOnboardingInstances.mockReturnValue({
      selectedPackageViewOnboardingInstances: undefined,
    });
    mockUseOnboardingInstances.mockReturnValue({
      isEnabled: true,
      isLoading: false,
      onboardingInstancesByPackage: new Map([['aws_bedrock', [{ id: 'd1' }, { id: 'd2' }]]]),
      isError: false,
      isTruncated: false,
      refetch: jest.fn(),
    });
    // Page 1 only holds aws.
    mockUseInstalledIntegrations.mockReturnValue({
      installedPackages: [installedPackage('aws', 'AWS')],
      countPerStatus: {},
      customIntegrationsCount: 0,
      isLoading: false,
      isInitialLoading: false,
      total: 30,
    });
    mockUseGetPackageInfo.mockReturnValue({ data: undefined });
  });

  const render = () =>
    createIntegrationsTestRendererMock().render(
      <InstalledIntegrationsPage prereleaseIntegrationsEnabled={false} />
    );

  it('opens the instances of a package on the current page without fetching it', () => {
    mockUseOnboardingInstances.mockReturnValue({
      isEnabled: true,
      isLoading: false,
      onboardingInstancesByPackage: new Map([['aws', [{ id: 'd1' }]]]),
      isError: false,
      isTruncated: false,
      refetch: jest.fn(),
    });
    mockUseViewOnboardingInstances.mockReturnValue({
      selectedPackageViewOnboardingInstances: 'aws',
    });
    render();

    expect(screen.getByTestId('instancesPanel')).toHaveTextContent('AWS (1)');
    expect(mockUseGetPackageInfo).toHaveBeenCalledWith('aws', undefined, undefined, {
      enabled: false,
    });
  });

  it('opens the instances of a package that is not on the current page', () => {
    mockUseViewOnboardingInstances.mockReturnValue({
      selectedPackageViewOnboardingInstances: 'aws_bedrock',
    });
    mockUseGetPackageInfo.mockReturnValue({
      data: { item: { name: 'aws_bedrock', title: 'Amazon Bedrock', version: '2.2.0', icons: [] } },
    });
    render();

    expect(mockUseGetPackageInfo).toHaveBeenCalledWith('aws_bedrock', undefined, undefined, {
      enabled: true,
    });
    expect(screen.getByTestId('instancesPanel')).toHaveTextContent('Amazon Bedrock (2)');
  });

  it('waits for the package before opening a panel for a package off the current page', () => {
    mockUseViewOnboardingInstances.mockReturnValue({
      selectedPackageViewOnboardingInstances: 'aws_bedrock',
    });
    render();

    expect(screen.queryByTestId('instancesPanel')).not.toBeInTheDocument();
  });

  it('still opens the instances, named after the package, when the package cannot be read', () => {
    mockUseViewOnboardingInstances.mockReturnValue({
      selectedPackageViewOnboardingInstances: 'aws_bedrock',
    });
    mockUseGetPackageInfo.mockReturnValue({ data: undefined, isError: true });
    render();

    expect(screen.getByTestId('instancesPanel')).toHaveTextContent('aws_bedrock (2)');
  });

  it('passes the loading state of the instances to the panel', () => {
    mockUseOnboardingInstances.mockReturnValue({
      isEnabled: true,
      isLoading: true,
      onboardingInstancesByPackage: new Map(),
      isError: false,
      isTruncated: false,
      refetch: jest.fn(),
    });
    mockUseViewOnboardingInstances.mockReturnValue({
      selectedPackageViewOnboardingInstances: 'aws',
    });
    render();

    expect(screen.getByTestId('instancesPanel')).toHaveTextContent('AWS (0) loading');
  });

  it('opens no panel and fetches nothing when instances are not enabled', () => {
    mockUseOnboardingInstances.mockReturnValue({
      isEnabled: false,
      isLoading: false,
      onboardingInstancesByPackage: new Map(),
      isError: false,
      isTruncated: false,
      refetch: jest.fn(),
    });
    mockUseViewOnboardingInstances.mockReturnValue({
      selectedPackageViewOnboardingInstances: 'aws_bedrock',
    });
    render();

    expect(screen.queryByTestId('instancesPanel')).not.toBeInTheDocument();
    expect(mockUseGetPackageInfo).toHaveBeenCalledWith('aws_bedrock', undefined, undefined, {
      enabled: false,
    });
  });

  it('opens no panel without a selected package', () => {
    render();

    expect(screen.queryByTestId('instancesPanel')).not.toBeInTheDocument();
    expect(mockUseGetPackageInfo).toHaveBeenCalledWith('', undefined, undefined, {
      enabled: false,
    });
  });

  it('warns when the instances could not be loaded', () => {
    mockUseOnboardingInstances.mockReturnValue({
      isEnabled: true,
      isLoading: false,
      onboardingInstancesByPackage: new Map(),
      isError: true,
      isTruncated: false,
      refetch: jest.fn(),
    });
    render();

    expect(screen.getByTestId('instancesLoadError')).toBeInTheDocument();
  });

  it('warns when there were too many instances to load them all', () => {
    mockUseOnboardingInstances.mockReturnValue({
      isEnabled: true,
      isLoading: false,
      onboardingInstancesByPackage: new Map(),
      isError: false,
      isTruncated: true,
      refetch: jest.fn(),
    });
    render();

    expect(screen.getByTestId('instancesTruncated')).toBeInTheDocument();
  });
});
