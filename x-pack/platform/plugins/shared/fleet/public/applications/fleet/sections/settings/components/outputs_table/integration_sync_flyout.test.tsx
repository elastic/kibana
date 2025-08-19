/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { startCase } from 'lodash';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import { ThemeProvider } from 'styled-components';

import {
  SyncStatus,
  type GetRemoteSyncedIntegrationsStatusResponse,
} from '../../../../../../../common/types';
import { sendGetPackageInfoByKeyForRq, useStartServices } from '../../../../hooks';

import { IntegrationSyncFlyout } from './integration_sync_flyout';

jest.mock('../../../../hooks');
jest.mock('../../../../../../components', () => ({
  PackageIcon: () => <div data-test-subj="packageIcon" />,
}));

const mockSendGetPackageInfoByKeyForRq = sendGetPackageInfoByKeyForRq as jest.Mock;
const mockUseStartServices = useStartServices as jest.Mock;

describe('IntegrationSyncFlyout', () => {
  const mockOnClose = jest.fn();
  const mockSyncedIntegrationsStatus: GetRemoteSyncedIntegrationsStatusResponse = {
    integrations: [
      {
        package_name: 'elastic_agent',
        package_version: '2.2.1',
        sync_status: SyncStatus.COMPLETED,
        install_status: { main: 'installed', remote: 'installed' },
        updated_at: '2025-04-14T11:53:00.925Z',
      },
      {
        package_name: 'nginx',
        package_version: '1.25.1',
        sync_status: SyncStatus.FAILED,
        updated_at: '2025-04-14T11:53:00.925Z',
        install_status: { main: 'installed', remote: 'not_installed' },
        error: 'Nginx failed to install',
      },
      {
        package_name: 'system',
        package_version: '1.68.0',
        sync_status: SyncStatus.SYNCHRONIZING,
        install_status: { main: 'installed', remote: 'not_installed' },
        updated_at: '2025-04-14T11:53:04.106Z',
      },
      {
        package_name: '1password',
        package_version: '1.32.0',
        install_status: {
          main: 'not_installed',
          remote: 'installed',
        },
        updated_at: '2025-05-19T15:40:26.554Z',
        sync_status: SyncStatus.WARNING,
        warning: { message: 'Unable to remove package 1password:1.32.0', title: 'warning' },
      },
      {
        package_name: 'apache',
        package_version: '1.0.0',
        install_status: {
          main: 'not_installed',
          remote: 'not_installed',
        },
        updated_at: '2025-05-19T15:40:26.554Z',
        sync_status: SyncStatus.COMPLETED,
      },
    ],
    custom_assets: {
      'component_template:logs-system.auth@custom': {
        name: 'logs-system.auth@custom',
        type: 'component_template',
        package_name: 'system',
        package_version: '1.68.0',
        sync_status: SyncStatus.SYNCHRONIZING,
      },
      'component_template:logs-system.cpu@custom': {
        name: 'logs-system.cpu@custom',
        type: 'component_template',
        package_name: 'system',
        package_version: '1.68.0',
        sync_status: SyncStatus.COMPLETED,
      },
      'component_template:logs-nginx.auth@custom': {
        name: 'logs-nginx.auth@custom',
        type: 'component_template',
        package_name: 'nginx',
        package_version: '1.25.1',
        sync_status: SyncStatus.FAILED,
        error: 'logs-nginx.auth@custom failed to sync',
      },
    },
    error: 'Top level error message',
  };

  const renderComponent = () => {
    return render(
      <IntlProvider locale="en">
        <ThemeProvider
          theme={() => ({
            eui: { euiSizeS: '15px', euiSizeM: '20px', euiFormBorderColor: '#FFFFFF' },
          })}
        >
          <IntegrationSyncFlyout
            onClose={mockOnClose}
            outputName="output1"
            syncedIntegrationsStatus={mockSyncedIntegrationsStatus}
          />
        </ThemeProvider>
      </IntlProvider>
    );
  };

  beforeEach(() => {
    mockSendGetPackageInfoByKeyForRq.mockImplementation((packageName) =>
      Promise.resolve({
        title: startCase(packageName),
      })
    );
    mockUseStartServices.mockReturnValue({
      docLinks: {
        links: {
          fleet: {
            remoteESOoutput: 'https://www.elastic.co/guide/en/fleet/current/remote-output.html',
          },
        },
      },
    });
  });

  it('render accordion per integration', async () => {
    const component = renderComponent();
    expect(component.getByTestId('integrationSyncFlyoutHeaderText').textContent).toContain(
      `You're viewing sync activity for output1.`
    );
    expect(component.getByTestId('integrationSyncFlyoutTopErrorCallout').textContent).toEqual(
      'ErrorTop level error message'
    );

    expect(component.getByTestId('elastic_agent-accordion').textContent).toContain('Completed');
    expect(component.getByTestId('nginx-accordion').textContent).toContain('Failed');
    expect(component.getByTestId('system-accordion').textContent).toContain('Syncing...');
    expect(component.getByTestId('1password-accordion').textContent).toContain('Warning');
    expect(component.queryByTestId('apache-accordion')).not.toBeInTheDocument();

    await userEvent.click(component.getByTestId('nginx-accordion-openCloseToggle'));
    expect(component.getByTestId('integrationSyncIntegrationErrorCallout').textContent).toEqual(
      'ErrorNginx failed to install'
    );

    await userEvent.click(
      component.getByTestId('component_template:logs-nginx.auth@custom-accordion')
    );
    expect(component.getByTestId('integrationSyncAssetErrorCallout').textContent).toEqual(
      'Errorlogs-nginx.auth@custom failed to sync'
    );

    expect(
      component.getByTestId('component_template:logs-system.auth@custom-accordion')
    ).toBeInTheDocument();
    expect(
      component.getByTestId('component_template:logs-system.cpu@custom-accordion')
    ).toBeInTheDocument();
  });
});
