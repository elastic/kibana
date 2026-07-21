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
    useBulkGetAgentPoliciesQuery: jest
      .fn()
      .mockReturnValue({ data: { items: [] }, isLoading: false }),
    useGetPackageInstallStatus: jest.fn(),
    useGetSettingsQuery: jest.fn().mockReturnValue({
      data: { item: { integration_knowledge_enabled: true } },
    }),
    useLink: jest.fn().mockReturnValue({ getHref: jest.fn() }),
    useStartServices: jest.fn().mockReturnValue({
      notifications: {
        toasts: {
          addError: jest.fn(),
          addSuccess: jest.fn(),
        },
      },
      docLinks: {
        links: {
          fleet: {
            datastreams: 'https://www.elastic.co/docs/reference/fleet/data-streams',
          },
        },
      },
    }),
    useUpgradePackagePolicyDryRunQuery: jest.fn().mockReturnValue({ data: null }),
    useUpgradeAgentlessPoliciesDryRunQuery: jest.fn().mockReturnValue({ data: null }),
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
  isAgentlessPoliciesUIEnabled: jest.fn().mockReturnValue(true),
}));

jest.mock('../../installed_integrations/hooks/use_installed_integrations_actions', () => ({
  useInstalledIntegrationsActions: jest.fn().mockReturnValue({
    actions: {
      bulkRollbackIntegrationsWithConfirmModal: jest.fn(),
    },
  }),
}));

// Import after mocks are defined
import {
  useGetPackageInstallStatus,
  useAuthz,
  useGetPackagePoliciesQuery,
  useBulkGetAgentPoliciesQuery,
  useUpgradePackagePolicyDryRunQuery,
  useUpgradeAgentlessPoliciesDryRunQuery,
} from '../../../../../hooks';
import { isAgentlessPoliciesUIEnabled } from '../../../../../services';

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
        fleet: { readSettings: true },
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
        fleet: { readSettings: true },
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
        fleet: { readSettings: true },
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

  describe('agentless upgrade partition', () => {
    const policies = [
      { id: 'agent-based-policy', supports_agentless: false, policy_ids: [] },
      { id: 'agentless-policy', supports_agentless: true, policy_ids: [] },
    ];

    beforeEach(() => {
      mockUseGetPackageInstallStatus.mockReturnValue(() => ({
        status: InstallStatus.installed,
        version: '1.3.0',
      }));
      mockUseAuthz.mockReturnValue({
        fleet: { readSettings: true },
        integrations: { installPackages: true, writePackageSettings: true },
      });
      jest.mocked(useGetPackagePoliciesQuery).mockReturnValue({
        data: { items: policies },
      } as any);
    });

    afterEach(() => {
      jest.mocked(useGetPackagePoliciesQuery).mockReturnValue({ data: { items: [] } } as any);
      jest
        .mocked(useBulkGetAgentPoliciesQuery)
        .mockReturnValue({ data: { items: [] }, isLoading: false } as any);
      jest.mocked(isAgentlessPoliciesUIEnabled).mockReturnValue(true);
    });

    const installedPackageInfo = {
      ...basePackageInfo,
      status: 'installed',
    } as PackageInfo;

    it('routes agentless policies to the agentless dry-run when the agentless policies UI is enabled', () => {
      renderComponent(installedPackageInfo);

      expect(jest.mocked(useUpgradePackagePolicyDryRunQuery).mock.calls[0][0]).toEqual([
        'agent-based-policy',
      ]);
      expect(jest.mocked(useUpgradeAgentlessPoliciesDryRunQuery).mock.calls[0][0]).toEqual([
        'agentless-policy',
      ]);
    });

    it('routes all policies to the legacy dry-run when the agentless policies UI is disabled', () => {
      jest.mocked(isAgentlessPoliciesUIEnabled).mockReturnValue(false);

      renderComponent(installedPackageInfo);

      expect(jest.mocked(useUpgradePackagePolicyDryRunQuery).mock.calls[0][0]).toEqual([
        'agent-based-policy',
        'agentless-policy',
      ]);
      expect(jest.mocked(useUpgradeAgentlessPoliciesDryRunQuery).mock.calls[0][0]).toEqual([]);
    });

    it('routes a parent-only agentless policy (no own supports_agentless flag) to the agentless dry-run', () => {
      // Older agentless policies carry the flag only on their parent agent policy; the server's
      // block matches them via the parent, so the client must too or they poison the legacy batch.
      jest.mocked(useGetPackagePoliciesQuery).mockReturnValue({
        data: {
          items: [
            { id: 'agent-based-policy', supports_agentless: false, policy_ids: ['regular-agent'] },
            { id: 'legacy-agentless', supports_agentless: false, policy_ids: ['agentless-agent'] },
          ],
        },
      } as any);
      jest.mocked(useBulkGetAgentPoliciesQuery).mockReturnValue({
        data: {
          items: [
            { id: 'regular-agent', supports_agentless: false },
            { id: 'agentless-agent', supports_agentless: true },
          ],
        },
        isLoading: false,
      } as any);

      renderComponent(installedPackageInfo);

      expect(jest.mocked(useUpgradePackagePolicyDryRunQuery).mock.calls[0][0]).toEqual([
        'agent-based-policy',
      ]);
      expect(jest.mocked(useUpgradeAgentlessPoliciesDryRunQuery).mock.calls[0][0]).toEqual([
        'legacy-agentless',
      ]);
    });

    it('holds the legacy dry-run (enabled: false) until the parent agent-policy lookup resolves', () => {
      jest.mocked(useGetPackagePoliciesQuery).mockReturnValue({
        data: {
          items: [
            { id: 'agent-based-policy', supports_agentless: false, policy_ids: ['regular-agent'] },
          ],
        },
      } as any);
      jest.mocked(useBulkGetAgentPoliciesQuery).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any);

      renderComponent(installedPackageInfo);

      // While the parent lookup is loading, the legacy dry-run must not fire (a still-hidden
      // parent-only agentless policy could otherwise 400 the whole batch).
      expect(jest.mocked(useUpgradePackagePolicyDryRunQuery).mock.calls[0][2]?.enabled).toBe(false);
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
        fleet: { readSettings: true },
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

  describe('namespace customization section', () => {
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
        namespace_customization_enabled_for: ['production'],
      },
    } as PackageInfo;

    beforeEach(() => {
      mockUseGetPackageInstallStatus.mockReturnValue(() => ({
        status: InstallStatus.installed,
        version: '1.3.0',
      }));
      mockUseAuthz.mockReturnValue({
        fleet: { readSettings: true },
        integrations: {
          installPackages: true,
          writePackageSettings: true,
        },
      });
    });

    it('renders the section title and existing opted-in namespaces', () => {
      const result = renderComponent(installedPackageInfo);

      expect(result.getByText('Namespace index templates')).toBeInTheDocument();
      const input = result.getByTestId('epmSettings.namespaceCustomizationInput');
      expect(input).toBeInTheDocument();
      expect(result.getByText('production')).toBeInTheDocument();
    });

    it('does not render the section when the package is not installed', () => {
      mockUseGetPackageInstallStatus.mockReturnValue(() => ({
        status: InstallStatus.notInstalled,
        version: null,
      }));

      const result = renderComponent(basePackageInfo);
      expect(result.queryByText('Namespace index templates')).not.toBeInTheDocument();
    });
  });
});
