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

import { useViewInstances } from './hooks/use_url_filters';
import { useInstances } from './hooks/use_instances';
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
  useViewInstances: jest.fn(),
}));
jest.mock('./hooks/use_instances', () => ({ useInstances: jest.fn() }));
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
jest.mock('./components/instances_panel', () => ({
  InstancesPanel: ({
    installedPackage,
    instances,
  }: {
    installedPackage: PanelPackage;
    instances: unknown[];
  }) => (
    <div data-test-subj="instancesPanel">
      {installedPackage.title} ({instances.length})
    </div>
  ),
}));

const mockUseViewInstances = useViewInstances as jest.Mock;
const mockUseInstances = useInstances as jest.Mock;
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
    mockUseViewInstances.mockReturnValue({ selectedPackageViewInstances: undefined });
    mockUseInstances.mockReturnValue({
      instancesByPackage: new Map([['aws_bedrock', [{ id: 'd1' }, { id: 'd2' }]]]),
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
    mockUseInstances.mockReturnValue({
      instancesByPackage: new Map([['aws', [{ id: 'd1' }]]]),
      isError: false,
      isTruncated: false,
      refetch: jest.fn(),
    });
    mockUseViewInstances.mockReturnValue({ selectedPackageViewInstances: 'aws' });
    render();

    expect(screen.getByTestId('instancesPanel')).toHaveTextContent('AWS (1)');
    expect(mockUseGetPackageInfo).toHaveBeenCalledWith('aws', undefined, undefined, {
      enabled: false,
    });
  });

  it('opens the instances of a package that is not on the current page', () => {
    mockUseViewInstances.mockReturnValue({ selectedPackageViewInstances: 'aws_bedrock' });
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
    mockUseViewInstances.mockReturnValue({ selectedPackageViewInstances: 'aws_bedrock' });
    render();

    expect(screen.queryByTestId('instancesPanel')).not.toBeInTheDocument();
  });

  it('opens no panel without a selected package', () => {
    render();

    expect(screen.queryByTestId('instancesPanel')).not.toBeInTheDocument();
    expect(mockUseGetPackageInfo).toHaveBeenCalledWith('', undefined, undefined, {
      enabled: false,
    });
  });

  it('warns when the instances could not be loaded', () => {
    mockUseInstances.mockReturnValue({
      instancesByPackage: new Map(),
      isError: true,
      isTruncated: false,
      refetch: jest.fn(),
    });
    render();

    expect(screen.getByTestId('instancesLoadError')).toBeInTheDocument();
  });

  it('warns when there were too many instances to load them all', () => {
    mockUseInstances.mockReturnValue({
      instancesByPackage: new Map(),
      isError: false,
      isTruncated: true,
      refetch: jest.fn(),
    });
    render();

    expect(screen.getByTestId('instancesTruncated')).toBeInTheDocument();
  });
});
