/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createIntegrationsTestRendererMock } from '../../../../../../../mock';
import type { PackageInfo } from '../../../../../types';
import { InstallStatus } from '../../../../../types';

jest.mock('../../../../../hooks', () => {
  return {
    ...jest.requireActual('../../../../../hooks'),
    useGetPackagePoliciesQuery: jest.fn().mockReturnValue({ data: { items: [] } }),
    useGetPackageInstallStatus: jest.fn(),
    useLink: jest.fn().mockReturnValue({ getHref: jest.fn() }),
    useStartServices: jest.fn().mockReturnValue({
      notifications: {
        toasts: {
          addError: jest.fn(),
          addSuccess: jest.fn(),
        },
      },
    }),
    useUpgradePackagePolicyDryRunQuery: jest.fn().mockReturnValue({ data: null }),
    useUpdatePackageMutation: jest.fn().mockReturnValue({ mutate: jest.fn() }),
    useAuthz: jest.fn(),
    useConfirmForceInstall: jest.fn().mockReturnValue(jest.fn()),
  };
});

jest.mock('../hooks', () => ({
  useChangelog: jest.fn().mockReturnValue({
    changelog: [],
    breakingChanges: null,
    isLoading: false,
    error: null,
  }),
}));

jest.mock('../../../../../services', () => ({
  ExperimentalFeaturesService: {
    get: jest.fn().mockReturnValue({ enablePackageRollback: false }),
  },
}));

// Import after mocks are defined
import { useGetPackageInstallStatus, useAuthz } from '../../../../../hooks';

import { SettingsPage } from './settings';

const mockUseGetPackageInstallStatus = useGetPackageInstallStatus as jest.Mock;
const mockUseAuthz = useAuthz as jest.Mock;

function renderComponent(packageInfo: PackageInfo) {
  const renderer = createIntegrationsTestRendererMock();

  const mockStartServices = {
    analytics: {},
    i18n: {},
    theme: {},
  };

  return renderer.render(
    <SettingsPage
      packageInfo={packageInfo}
      startServices={mockStartServices as any}
      isCustomPackage={false}
    />
  );
}

describe('SettingsPage', () => {
  const basePackageInfo: PackageInfo = {
    name: 'nginx',
    title: 'Nginx',
    version: '1.3.0',
    latestVersion: '1.3.0',
    release: 'ga',
    description: 'Collect logs and metrics from Nginx HTTP servers with Elastic Agent.',
    format_version: '',
    owner: { github: '' },
    assets: {} as any,
    policy_templates: [],
    data_streams: [],
    keepPoliciesUpToDate: false,
    status: 'not_installed',
  } as PackageInfo;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when the integration is not installed', () => {
    beforeEach(() => {
      mockUseGetPackageInstallStatus.mockReturnValue(() => ({
        status: InstallStatus.notInstalled,
        version: null,
      }));
    });

    it('should display the install section with install description when user has install permission', () => {
      mockUseAuthz.mockReturnValue({
        integrations: {
          installPackages: true,
          writePackageSettings: true,
        },
      });

      const result = renderComponent(basePackageInfo);

      // Check for the heading (h4)
      expect(result.getByRole('heading', { name: 'Install Nginx' })).toBeInTheDocument();
      expect(
        result.getByText(
          'Install this integration to setup Kibana and Elasticsearch assets designed for Nginx data.'
        )
      ).toBeInTheDocument();
      // Check for the install button
      expect(result.getByTestId('installAssetsButton')).toBeInTheDocument();
      expect(result.queryByTestId('installPermissionCallout')).not.toBeInTheDocument();
    });

    it('should display permission callout when user does not have install permission', () => {
      mockUseAuthz.mockReturnValue({
        integrations: {
          installPackages: false,
          writePackageSettings: false,
        },
      });

      const result = renderComponent(basePackageInfo);

      // Check for the heading (h4)
      expect(result.getByRole('heading', { name: 'Install Nginx' })).toBeInTheDocument();
      expect(result.getByTestId('installPermissionCallout')).toBeInTheDocument();
      expect(result.getByText('Permission required')).toBeInTheDocument();
      expect(
        result.getByText(
          'You do not have permission to install this integration. Contact your administrator.'
        )
      ).toBeInTheDocument();
      // The install description and button should NOT be shown
      expect(
        result.queryByText(
          'Install this integration to setup Kibana and Elasticsearch assets designed for Nginx data.'
        )
      ).not.toBeInTheDocument();
      expect(result.queryByTestId('installAssetsButton')).not.toBeInTheDocument();
    });
  });

  describe('when the integration is installed', () => {
    beforeEach(() => {
      mockUseGetPackageInstallStatus.mockReturnValue(() => ({
        status: InstallStatus.installed,
        version: '1.3.0',
      }));
    });

    it('should not display the install section or permission callout', () => {
      mockUseAuthz.mockReturnValue({
        integrations: {
          installPackages: false,
          writePackageSettings: false,
        },
      });

      const installedPackageInfo = {
        ...basePackageInfo,
        status: 'installed',
      } as PackageInfo;

      const result = renderComponent(installedPackageInfo);

      // Should show version info instead of install section
      expect(result.getByText('Installed version')).toBeInTheDocument();
      expect(result.queryByTestId('installPermissionCallout')).not.toBeInTheDocument();
    });
  });
});
