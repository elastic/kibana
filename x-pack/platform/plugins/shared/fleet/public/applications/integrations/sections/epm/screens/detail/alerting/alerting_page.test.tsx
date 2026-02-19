/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '@kbn/i18n-react';

import type { PackageInfo } from '../../../../../types';

const mockHttpGet = jest.fn();
const mockSendGetBulkAssets = jest.fn();
const mockUseAuthz = jest.fn();
const mockExperimentalFeaturesGet = jest.fn();

jest.mock('../../../../../hooks', () => ({
  useGetPackageInstallStatus: jest.fn().mockReturnValue(() => ({
    status: 'installed',
    version: '1.0.0',
  })),
  useLink: jest.fn().mockReturnValue({ getPath: jest.fn().mockReturnValue('/mock') }),
  useStartServices: jest.fn().mockReturnValue({
    notifications: {
      toasts: { addInfo: jest.fn(), addSuccess: jest.fn(), addError: jest.fn() },
    },
    http: {
      get: (...args: any[]) => mockHttpGet(...args),
      basePath: { prepend: (path: string) => `/mock${path}` },
    },
  }),
  useFleetStatus: jest.fn().mockReturnValue({ spaceId: 'default' }),
  useAuthz: (...args: any[]) => mockUseAuthz(...args),
  sendGetBulkAssets: (...args: any[]) => mockSendGetBulkAssets(...args),
  sendRequestInstallRuleAssets: jest.fn(),
}));

jest.mock('../../../../../services', () => ({
  ExperimentalFeaturesService: {
    get: (...args: any[]) => mockExperimentalFeaturesGet(...args),
  },
}));

jest.mock('../../../components/side_bar_column', () => ({
  SideBarColumn: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

import { AlertingPage } from './alerting_page';

describe('AlertingPage', () => {
  const baseInstallationInfo = {
    version: '1.0.0',
    install_source: 'registry' as const,
    installed_kibana_space_id: 'default',
    installed_kibana: [
      { id: 'template-1', type: 'alerting_rule_template' as const },
      { id: 'template-2', type: 'alerting_rule_template' as const },
    ],
    installed_es: [],
  };

  const basePackageInfo = {
    name: 'system',
    title: 'System',
    version: '1.0.0',
    release: 'ga',
    description: 'System integration',
    format_version: '1.0.0',
    owner: { github: 'elastic/integrations' },
    type: 'integration',
    status: 'installed',
    assets: {} as any,
    policy_templates: [],
    data_streams: [
      {
        type: 'logs',
        dataset: 'system.syslog',
        title: 'System syslog',
        release: 'ga',
        package: 'system',
        path: 'syslog',
      },
    ],
    installationInfo: baseInstallationInfo,
  } as unknown as PackageInfo;

  const refetchPackageInfo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockHttpGet.mockResolvedValue({ data: [], total: 0 });

    mockSendGetBulkAssets.mockResolvedValue({
      data: {
        items: [
          {
            id: 'template-1',
            type: 'alerting_rule_template',
            attributes: { title: '[System] Logs template' },
            appLink:
              '/app/management/insightsAndAlerting/triggersActions/create/template/template-1',
          },
          {
            id: 'template-2',
            type: 'alerting_rule_template',
            attributes: { title: '[System] Metrics template' },
            appLink:
              '/app/management/insightsAndAlerting/triggersActions/create/template/template-2',
          },
        ],
      },
    });

    mockUseAuthz.mockReturnValue({
      integrations: {
        installPackages: true,
        readPackageInfo: true,
      },
    });

    mockExperimentalFeaturesGet.mockReturnValue({
      enableIntegrationInactivityAlerting: false,
    });
  });

  const renderComponent = (packageInfo: PackageInfo = basePackageInfo) => {
    return render(
      <I18nProvider>
        <MemoryRouter>
          <AlertingPage packageInfo={packageInfo} refetchPackageInfo={refetchPackageInfo} />
        </MemoryRouter>
      </I18nProvider>
    );
  };

  it('should render alerting rule templates', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('[System] Logs template')).toBeInTheDocument();
      expect(screen.getByText('[System] Metrics template')).toBeInTheDocument();
    });

    expect(mockSendGetBulkAssets).toHaveBeenCalledWith({
      assetIds: [
        { id: 'template-1', type: 'alerting_rule_template' },
        { id: 'template-2', type: 'alerting_rule_template' },
      ],
    });
  });

  it('should render user-created rules', async () => {
    mockHttpGet.mockResolvedValue({
      data: [{ id: 'user-rule-1', name: '[System] My custom rule' }],
      total: 1,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('[System] My custom rule')).toBeInTheDocument();
    });

    expect(mockHttpGet).toHaveBeenCalledWith('/api/alerting/rules/_find', {
      query: {
        filter: 'alert.attributes.tags:"System"',
        per_page: 1000,
        fields: '["name"]',
      },
    });
  });

  it('should show "No alerting assets found" when there are no assets', async () => {
    const emptyPackage = {
      ...basePackageInfo,
      installationInfo: {
        ...baseInstallationInfo,
        installed_kibana: [],
      },
    } as unknown as PackageInfo;

    mockSendGetBulkAssets.mockResolvedValue({ data: { items: [] } });
    mockHttpGet.mockResolvedValue({ data: [], total: 0 });

    renderComponent(emptyPackage);

    await waitFor(() => {
      expect(screen.getByText('No alerting assets found')).toBeInTheDocument();
    });
  });

  it('should show the reinstall section when user has install permissions', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('fleetAlertingReinstallButton')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Reinstall alerting rule template assets for this integration.')
    ).toBeInTheDocument();
  });

  it('should not show the reinstall section when user lacks install permissions', async () => {
    mockUseAuthz.mockReturnValue({
      integrations: {
        installPackages: false,
        readPackageInfo: true,
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('[System] Logs template')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('fleetAlertingReinstallButton')).not.toBeInTheDocument();
  });

  it('should show permission error when user cannot read package settings', async () => {
    mockUseAuthz.mockReturnValue({
      integrations: {
        installPackages: false,
        readPackageInfo: false,
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Permission error')).toBeInTheDocument();
    });
  });

  describe('inactivity monitoring callout', () => {
    it('should show callout when feature flag is enabled and template is missing', async () => {
      mockExperimentalFeaturesGet.mockReturnValue({
        enableIntegrationInactivityAlerting: true,
      });

      const packageWithoutInactivity = {
        ...basePackageInfo,
        installationInfo: {
          ...baseInstallationInfo,
          installed_kibana: [{ id: 'template-1', type: 'alerting_rule_template' }],
        },
      } as unknown as PackageInfo;

      mockSendGetBulkAssets.mockResolvedValue({
        data: {
          items: [
            {
              id: 'template-1',
              type: 'alerting_rule_template',
              attributes: { title: '[System] Template' },
            },
          ],
        },
      });

      renderComponent(packageWithoutInactivity);

      await waitFor(() => {
        expect(screen.getByText('Idle data streams alerting available')).toBeInTheDocument();
      });

      expect(
        screen.getByText(
          'Reinstall alerting assets to add an alerting rule template for monitoring idle data streams.'
        )
      ).toBeInTheDocument();
    });

    it('should not show callout when feature flag is disabled', async () => {
      mockExperimentalFeaturesGet.mockReturnValue({
        enableIntegrationInactivityAlerting: false,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('[System] Logs template')).toBeInTheDocument();
      });

      expect(screen.queryByText('Idle data streams alerting available')).not.toBeInTheDocument();
    });

    it('should not show callout when inactivity template exists', async () => {
      mockExperimentalFeaturesGet.mockReturnValue({
        enableIntegrationInactivityAlerting: true,
      });

      const packageWithInactivity = {
        ...basePackageInfo,
        installationInfo: {
          ...baseInstallationInfo,
          installed_kibana: [
            { id: 'template-1', type: 'alerting_rule_template' },
            { id: 'fleet-system-inactivity-monitoring', type: 'alerting_rule_template' },
          ],
        },
      } as unknown as PackageInfo;

      mockSendGetBulkAssets.mockResolvedValue({
        data: {
          items: [
            {
              id: 'template-1',
              type: 'alerting_rule_template',
              attributes: { title: '[System] Template' },
            },
            {
              id: 'fleet-system-inactivity-monitoring',
              type: 'alerting_rule_template',
              attributes: { title: '[System] Inactivity monitoring' },
            },
          ],
        },
      });

      renderComponent(packageWithInactivity);

      await waitFor(() => {
        expect(screen.getByText('[System] Template')).toBeInTheDocument();
      });

      expect(screen.queryByText('Idle data streams alerting available')).not.toBeInTheDocument();
    });
  });

  it('should deduplicate Fleet-managed rules from alerting API results', async () => {
    const packageWithFleetRule = {
      ...basePackageInfo,
      installationInfo: {
        ...baseInstallationInfo,
        installed_kibana: [
          { id: 'template-1', type: 'alerting_rule_template' },
          { id: 'fleet-managed-rule-1', type: 'alert' },
        ],
      },
    } as unknown as PackageInfo;

    mockSendGetBulkAssets.mockResolvedValue({
      data: {
        items: [
          {
            id: 'template-1',
            type: 'alerting_rule_template',
            attributes: { title: '[System] Template' },
          },
          {
            id: 'fleet-managed-rule-1',
            type: 'alert',
            attributes: { title: '[System] Fleet rule' },
          },
        ],
      },
    });

    mockHttpGet.mockResolvedValue({
      data: [
        { id: 'fleet-managed-rule-1', name: '[System] Fleet rule' },
        { id: 'user-rule-1', name: '[System] User rule' },
      ],
      total: 2,
    });

    renderComponent(packageWithFleetRule);

    await waitFor(() => {
      expect(screen.getByText('[System] User rule')).toBeInTheDocument();
    });

    const fleetRuleElements = screen.getAllByText('[System] Fleet rule');
    expect(fleetRuleElements).toHaveLength(1);
  });
});
