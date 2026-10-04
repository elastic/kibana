/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { EditConnectorProps } from '.';
import { EditConnector } from '.';
import { noPushCasesPermissions, renderWithTestingProviders } from '../../common/mock';
import { basicCase, connectorsMock } from '../../containers/mock';
import { getCaseConnectorsMockResponse } from '../../common/mock/connectors';
import type { ReturnUsePushToService } from '../use_push_to_service';
import { usePushToService } from '../use_push_to_service';
import { usePostSyncCase } from '../../containers/use_post_sync_case';
import { useLicense } from '../../common/use_license';
import { useCasesConfig } from '../../common/lib/kibana/hooks';

jest.mock('../../common/lib/kibana/hooks', () => ({
  ...jest.requireActual('../../common/lib/kibana/hooks'),
  useCasesConfig: jest.fn(),
}));
jest.mock('../use_push_to_service');
jest.mock('../../containers/use_post_sync_case');
jest.mock('../../common/use_license');

const usePushToServiceMockRes: ReturnUsePushToService = {
  errorsMsg: [],
  hasErrorMessages: false,
  needsToBePushed: false,
  hasBeenPushed: true,
  isLoading: false,
  hasLicenseError: false,
  hasPushPermissions: true,
  handlePushToService: jest.fn(),
};

const syncMutate = jest.fn();
const onUpdateSettings = jest.fn();

const props: EditConnectorProps = {
  caseData: {
    ...basicCase,
    connector: { ...basicCase.connector, id: 'servicenow-1' },
    settings: { syncAlerts: true },
  },
  supportedActionConnectors: connectorsMock,
  isLoading: false,
  caseConnectors: getCaseConnectorsMockResponse(),
  onSubmit: jest.fn(),
  onUpdateSettings,
  showHeader: false,
  actionsVariant: 'outlined',
};

describe('EditConnector sync controls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useCasesConfig as jest.Mock).mockReturnValue({ bidirectionalSyncEnabled: true });
    (usePushToService as jest.Mock).mockReturnValue(usePushToServiceMockRes);
    (usePostSyncCase as jest.Mock).mockReturnValue({ isLoading: false, mutate: syncMutate });
    (useLicense as jest.Mock).mockReturnValue({ isAtLeastEnterprise: () => true });
  });

  it('shows the sync settings and the sync action for a pushed case', async () => {
    renderWithTestingProviders(<EditConnector {...props} />);

    expect(await screen.findByTestId('connector-sync-settings')).toBeInTheDocument();
    expect(screen.getByTestId('connector-sync-tech-preview-badge')).toBeInTheDocument();
    expect(screen.getByTestId('sync-from-external-service')).toBeEnabled();
  });

  it('saves the auto-push setting on the case', async () => {
    renderWithTestingProviders(<EditConnector {...props} />);

    await userEvent.click(await screen.findByTestId('connector-auto-push-switch'));

    expect(onUpdateSettings).toHaveBeenCalledWith({
      syncAlerts: true,
      externalSync: { autoPush: true, conflictStrategy: 'external' },
    });
  });

  it('syncs the case from the connector', async () => {
    renderWithTestingProviders(<EditConnector {...props} />);

    await userEvent.click(await screen.findByTestId('sync-from-external-service'));

    expect(syncMutate).toHaveBeenCalledWith({
      caseId: basicCase.id,
      connectorName: 'My SN connector',
    });
  });

  it('disables the sync action until the case has been pushed', async () => {
    (usePushToService as jest.Mock).mockReturnValue({
      ...usePushToServiceMockRes,
      hasBeenPushed: false,
    });

    renderWithTestingProviders(<EditConnector {...props} />);

    expect(await screen.findByTestId('sync-from-external-service')).toBeDisabled();
  });

  it('hides the sync controls when the feature is off', () => {
    (useCasesConfig as jest.Mock).mockReturnValue({ bidirectionalSyncEnabled: false });

    renderWithTestingProviders(<EditConnector {...props} />);

    expect(screen.queryByTestId('connector-sync-settings')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sync-from-external-service')).not.toBeInTheDocument();
  });

  it('hides the sync controls below an Enterprise license', () => {
    (useLicense as jest.Mock).mockReturnValue({ isAtLeastEnterprise: () => false });

    renderWithTestingProviders(<EditConnector {...props} />);

    expect(screen.queryByTestId('connector-sync-settings')).not.toBeInTheDocument();
  });

  it('hides the sync controls without the push privilege', () => {
    (usePushToService as jest.Mock).mockReturnValue({
      ...usePushToServiceMockRes,
      hasPushPermissions: false,
    });

    renderWithTestingProviders(<EditConnector {...props} />, {
      wrapperProps: { permissions: noPushCasesPermissions() },
    });

    expect(screen.queryByTestId('connector-sync-settings')).not.toBeInTheDocument();
  });

  it('hides the sync controls when the case connector no longer exists', () => {
    renderWithTestingProviders(
      <EditConnector
        {...props}
        caseData={{ ...props.caseData, connector: { ...props.caseData.connector, id: 'gone' } }}
      />
    );

    expect(screen.queryByTestId('connector-sync-settings')).not.toBeInTheDocument();
  });
});
