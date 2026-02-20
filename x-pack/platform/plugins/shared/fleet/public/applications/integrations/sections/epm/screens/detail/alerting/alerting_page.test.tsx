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

const mockUseAuthz = jest.fn();
const mockExperimentalFeaturesGet = jest.fn();
const mockUseAlertingAssets = jest.fn();

jest.mock('../../../../../services', () => ({
  ExperimentalFeaturesService: {
    get: (...args: any[]) => mockExperimentalFeaturesGet(...args),
  },
}));

jest.mock('../../../components/side_bar_column', () => ({
  SideBarColumn: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../hooks'),
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
      basePath: { prepend: (path: string) => `/mock${path}` },
    },
  }),
  useFleetStatus: jest.fn().mockReturnValue({ spaceId: 'default' }),
  useAuthz: (...args: any[]) => mockUseAuthz(...args),
  sendRequestInstallRuleAssets: jest.fn(),
  useAlertingAssets: (...args: any[]) => mockUseAlertingAssets(...args),
}));

import { AlertingPage } from './alerting_page';

describe('AlertingPage', () => {
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
    installationInfo: {
      version: '1.0.0',
      install_source: 'registry' as const,
      installed_kibana_space_id: 'default',
      installed_kibana: [
        { id: 'template-1', type: 'alerting_rule_template' as const },
        { id: 'template-2', type: 'alerting_rule_template' as const },
      ],
      installed_es: [],
    },
  } as unknown as PackageInfo;

  const refetchPackageInfo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAlertingAssets.mockReturnValue({
      alertingAssets: [
        { id: 'template-1', type: 'alerting_rule_template' },
        { id: 'template-2', type: 'alerting_rule_template' },
      ],
      alertingAssetsByType: {
        alerting_rule_template: [
          { id: 'template-1', type: 'alerting_rule_template' },
          { id: 'template-2', type: 'alerting_rule_template' },
        ],
      },
      deferredAlerts: [],
      assetSavedObjectsByType: {
        alerting_rule_template: {
          'template-1': {
            id: 'template-1',
            type: 'alerting_rule_template',
            attributes: { title: '[System] Logs template' },
            appLink:
              '/app/management/insightsAndAlerting/triggersActions/create/template/template-1',
          },
          'template-2': {
            id: 'template-2',
            type: 'alerting_rule_template',
            attributes: { title: '[System] Metrics template' },
            appLink:
              '/app/management/insightsAndAlerting/triggersActions/create/template/template-2',
          },
        },
      },
      userCreatedRules: [],
      isLoading: false,
      fetchError: undefined,
      refetch: jest.fn(),
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

  it('should render alerting rule templates from installed_kibana', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('[System] Logs template')).toBeInTheDocument();
      expect(screen.getByText('[System] Metrics template')).toBeInTheDocument();
    });
  });

  it('should render user-created rules from the alerting API', async () => {
    mockUseAlertingAssets.mockReturnValue({
      alertingAssets: [{ id: 'template-1', type: 'alerting_rule_template' }],
      alertingAssetsByType: {
        alerting_rule_template: [{ id: 'template-1', type: 'alerting_rule_template' }],
      },
      deferredAlerts: [],
      assetSavedObjectsByType: {
        alerting_rule_template: {
          'template-1': {
            id: 'template-1',
            type: 'alerting_rule_template',
            attributes: { title: '[System] Template' },
          },
        },
      },
      userCreatedRules: [
        {
          id: 'user-rule-1',
          type: 'alert',
          attributes: { title: '[System] My custom rule' },
          appLink: '/app/management/insightsAndAlerting/triggersActions/rule/user-rule-1',
        },
      ],
      isLoading: false,
      fetchError: undefined,
      refetch: jest.fn(),
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('[System] My custom rule')).toBeInTheDocument();
    });
  });

  it('should show "No alerting assets found" when there are no assets', async () => {
    mockUseAlertingAssets.mockReturnValue({
      alertingAssets: [],
      alertingAssetsByType: {},
      deferredAlerts: [],
      assetSavedObjectsByType: {},
      userCreatedRules: [],
      isLoading: false,
      fetchError: undefined,
      refetch: jest.fn(),
    });

    renderComponent();

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

      mockUseAlertingAssets.mockReturnValue({
        alertingAssets: [{ id: 'template-1', type: 'alerting_rule_template' }],
        alertingAssetsByType: {
          alerting_rule_template: [{ id: 'template-1', type: 'alerting_rule_template' }],
        },
        deferredAlerts: [],
        assetSavedObjectsByType: {
          alerting_rule_template: {
            'template-1': {
              id: 'template-1',
              type: 'alerting_rule_template',
              attributes: { title: '[System] Template' },
            },
          },
        },
        userCreatedRules: [],
        isLoading: false,
        fetchError: undefined,
        refetch: jest.fn(),
      });

      renderComponent();

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

      mockUseAlertingAssets.mockReturnValue({
        alertingAssets: [
          { id: 'template-1', type: 'alerting_rule_template' },
          { id: 'fleet-system-inactivity-monitoring', type: 'alerting_rule_template' },
        ],
        alertingAssetsByType: {
          alerting_rule_template: [
            { id: 'template-1', type: 'alerting_rule_template' },
            { id: 'fleet-system-inactivity-monitoring', type: 'alerting_rule_template' },
          ],
        },
        deferredAlerts: [],
        assetSavedObjectsByType: {
          alerting_rule_template: {
            'template-1': {
              id: 'template-1',
              type: 'alerting_rule_template',
              attributes: { title: '[System] Template' },
            },
            'fleet-system-inactivity-monitoring': {
              id: 'fleet-system-inactivity-monitoring',
              type: 'alerting_rule_template',
              attributes: { title: '[System] Idle data streams' },
            },
          },
        },
        userCreatedRules: [],
        isLoading: false,
        fetchError: undefined,
        refetch: jest.fn(),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('[System] Template')).toBeInTheDocument();
      });

      expect(screen.queryByText('Idle data streams alerting available')).not.toBeInTheDocument();
    });
  });

  it('should deduplicate Fleet-managed rules from alerting API results', async () => {
    mockUseAlertingAssets.mockReturnValue({
      alertingAssets: [
        { id: 'template-1', type: 'alerting_rule_template' },
        { id: 'fleet-managed-rule-1', type: 'alert' },
      ],
      alertingAssetsByType: {
        alerting_rule_template: [{ id: 'template-1', type: 'alerting_rule_template' }],
        alert: [{ id: 'fleet-managed-rule-1', type: 'alert' }],
      },
      deferredAlerts: [],
      assetSavedObjectsByType: {
        alerting_rule_template: {
          'template-1': {
            id: 'template-1',
            type: 'alerting_rule_template',
            attributes: { title: '[System] Template' },
          },
        },
        alert: {
          'fleet-managed-rule-1': {
            id: 'fleet-managed-rule-1',
            type: 'alert',
            attributes: { title: '[System] Fleet rule' },
          },
        },
      },
      userCreatedRules: [
        {
          id: 'user-rule-1',
          type: 'alert',
          attributes: { title: '[System] User rule' },
          appLink: '/app/management/insightsAndAlerting/triggersActions/rule/user-rule-1',
        },
      ],
      isLoading: false,
      fetchError: undefined,
      refetch: jest.fn(),
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('[System] User rule')).toBeInTheDocument();
    });

    const fleetRuleElements = screen.getAllByText('[System] Fleet rule');
    expect(fleetRuleElements).toHaveLength(1);
  });
});
