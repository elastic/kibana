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
    useInstallPackage: jest.fn().mockReturnValue(jest.fn()),
    useRollbackPackage: jest.fn().mockReturnValue(jest.fn()),
    useGetRollbackAvailableCheck: jest.fn().mockReturnValue({ isAvailable: true, reason: null }),
    useLicense: jest.fn().mockReturnValue({ isEnterprise: () => true }),
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
    get: jest.fn().mockReturnValue({ enablePackageRollback: true }),
  },
}));

jest.mock('../../installed_integrations/hooks/use_installed_integrations_actions', () => ({
  useInstalledIntegrationsActions: jest.fn().mockReturnValue({
    actions: {
      bulkRollbackIntegrationsWithConfirmModal: jest.fn(),
    },
  }),
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

  describe('Reinstall and Rollback button state management', () => {
    const installedPackageInfo: PackageInfo = {
      ...basePackageInfo,
      status: 'installed',
      installationInfo: {
        version: '1.3.0',
        previous_version: '1.2.0',
        install_source: 'registry',
        install_status: 'installed',
        verification_status: 'verified',
        verification_key_id: null,
        installed_kibana: [],
        installed_es: [],
        type: 'epm-package',
        name: 'nginx',
      },
    } as PackageInfo;

    beforeEach(() => {
      mockUseAuthz.mockReturnValue({
        integrations: {
          installPackages: true,
          writePackageSettings: true,
        },
      });
    });

    it('should disable Reinstall button when rollback is in progress', () => {
      mockUseGetPackageInstallStatus.mockReturnValue(() => ({
        status: InstallStatus.rollingBack,
        version: '1.3.0',
      }));

      const result = renderComponent(installedPackageInfo);

      const reinstallButton = result.getByTestId('reinstallButton');
      expect(reinstallButton).toBeDisabled();
    });

    it('should disable Rollback button when reinstall is in progress', () => {
      mockUseGetPackageInstallStatus.mockReturnValue(() => ({
        status: InstallStatus.reinstalling,
        version: '1.3.0',
      }));

      const result = renderComponent(installedPackageInfo);

      const rollbackButton = result.getByTestId('rollbackButton');
      expect(rollbackButton).toBeDisabled();
    });

    it('should enable both buttons when no operation is in progress', () => {
      mockUseGetPackageInstallStatus.mockReturnValue(() => ({
        status: InstallStatus.installed,
        version: '1.3.0',
      }));

      const result = renderComponent(installedPackageInfo);

      const reinstallButton = result.getByTestId('reinstallButton');
      const rollbackButton = result.getByTestId('rollbackButton');

      expect(reinstallButton).not.toBeDisabled();
      expect(rollbackButton).not.toBeDisabled();
    });

    it('should disable Reinstall button when uninstalling is in progress', () => {
      mockUseGetPackageInstallStatus.mockReturnValue(() => ({
        status: InstallStatus.uninstalling,
        version: '1.3.0',
      }));

      const result = renderComponent(installedPackageInfo);

      const reinstallButton = result.getByTestId('reinstallButton');
      expect(reinstallButton).toBeDisabled();
    });

    it('should disable Rollback button when uninstalling is in progress', () => {
      mockUseGetPackageInstallStatus.mockReturnValue(() => ({
        status: InstallStatus.uninstalling,
        version: '1.3.0',
      }));

      const result = renderComponent(installedPackageInfo);

      const rollbackButton = result.getByTestId('rollbackButton');
      expect(rollbackButton).toBeDisabled();
    });
  });
});
