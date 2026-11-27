/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';

jest.mock('../../../hooks/use_dataset_quality_details_state', () => ({
  useDatasetQualityDetailsState: jest.fn(),
}));

jest.mock('../../../utils/use_kibana', () => ({
  useKibanaContextForPlugin: jest.fn(),
}));

import { Integration } from '../../../../common/data_streams_stats/integration';
import type { Dashboard } from '../../../../common/api_types';
import { useDatasetQualityDetailsState } from '../../../hooks/use_dataset_quality_details_state';
import { useKibanaContextForPlugin } from '../../../utils/use_kibana';
import { IntegrationActionsMenu } from './integration_actions_menu';

const FLEET_SERVER = Integration.create({
  name: 'fleet_server',
  title: 'Fleet Server',
  version: '1.6.0',
  datasets: { output_health: 'Fleet Server output health' },
});

const DASHBOARD: Dashboard = { id: 'dashboard-1', title: 'Fleet Server overview' };

const renderMenu = ({
  dashboards,
  dashboardsLoading = false,
  canUserAccessDashboards = true,
}: {
  dashboards?: Dashboard[];
  dashboardsLoading?: boolean;
  canUserAccessDashboards?: boolean;
}) => {
  (useDatasetQualityDetailsState as jest.Mock).mockReturnValue({
    canUserAccessDashboards,
    canUserViewIntegrations: true,
    datasetDetails: { type: 'logs', name: 'fleet_server.output_health' },
    // `useDatasetDetailsTelemetry` runs for real so the link props keep their telemetry wrapper;
    // without `dataStreamDetails` it reports nothing, which is all this suite needs.
    telemetryClient: {
      getDatasetDetailsTrackingState: jest.fn(),
      startDatasetDetailsTracking: jest.fn(),
    },
    integrationDetails: { integration: { integration: FLEET_SERVER } },
    loadingState: { dataStreamDetailsLoading: true },
  });

  (useKibanaContextForPlugin as jest.Mock).mockReturnValue({
    services: {
      application: { navigateToUrl: jest.fn() },
      http: { basePath: { prepend: (path: string) => `/kbn${path}` } },
      share: { url: { locators: { get: jest.fn(() => undefined) } } },
    },
  });

  renderWithI18n(
    <IntegrationActionsMenu
      integration={FLEET_SERVER}
      dashboards={dashboards}
      dashboardsLoading={dashboardsLoading}
    />
  );

  fireEvent.click(screen.getByTestId('datasetQualityDetailsIntegrationActionsButton'));
};

describe('IntegrationActionsMenu', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('hides the dashboards action and links to the overview of a package without dashboards', () => {
    renderMenu({ dashboards: [] });

    expect(
      screen.queryByTestId('datasetQualityDetailsIntegrationActionViewDashboards')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('datasetQualityDetailsIntegrationActionDashboardsLoading')
    ).not.toBeInTheDocument();

    expect(screen.getByTestId('datasetQualityDetailsIntegrationActionOverview')).toHaveAttribute(
      'href',
      '/kbn/app/integrations/detail/fleet_server-1.6.0/overview'
    );
  });

  it('offers the dashboards action for a package shipping dashboards', () => {
    renderMenu({ dashboards: [DASHBOARD] });

    expect(
      screen.getByTestId('datasetQualityDetailsIntegrationActionViewDashboards')
    ).toBeInTheDocument();
  });

  it('hides the dashboards action from a user who cannot access dashboards', () => {
    renderMenu({ dashboards: [DASHBOARD], canUserAccessDashboards: false });

    expect(
      screen.queryByTestId('datasetQualityDetailsIntegrationActionViewDashboards')
    ).not.toBeInTheDocument();
  });

  it('stands in a disabled placeholder while the dashboard list is in flight', () => {
    renderMenu({ dashboardsLoading: true });

    expect(
      screen.getByTestId('datasetQualityDetailsIntegrationActionDashboardsLoading')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('datasetQualityDetailsIntegrationActionViewDashboards')
    ).not.toBeInTheDocument();
  });
});
