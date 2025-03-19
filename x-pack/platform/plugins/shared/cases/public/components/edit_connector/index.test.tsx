/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, screen } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';

import type { EditConnectorProps } from '.';
import { EditConnector } from '.';

import {
  noConnectorsCasePermission,
  noCasesPermissions,
  renderWithTestingProviders,
} from '../../common/mock';
import { basicCase, connectorsMock } from '../../containers/mock';
import { getCaseConnectorsMockResponse } from '../../common/mock/connectors';
import type { ReturnUsePushToService } from '../use_push_to_service';
import { usePushToService } from '../use_push_to_service';
import { ConnectorTypes } from '../../../common';
import { coreMock } from '@kbn/core/public/mocks';

const onSubmit = jest.fn();
const caseConnectors = getCaseConnectorsMockResponse();

const defaultProps: EditConnectorProps = {
  caseData: basicCase,
  supportedActionConnectors: connectorsMock,
  isLoading: false,
  caseConnectors,
  onSubmit,
};

jest.mock('../use_push_to_service');

const handlePushToService = jest.fn();
const usePushToServiceMock = usePushToService as jest.Mock;

const errorMsg = { id: 'test-error-msg', title: 'My error msg', description: 'My error desc' };

const usePushToServiceMockRes: ReturnUsePushToService = {
  errorsMsg: [],
  hasErrorMessages: false,
  needsToBePushed: true,
  hasBeenPushed: true,
  isLoading: false,
  hasLicenseError: false,
  hasPushPermissions: true,
  handlePushToService,
};

describe('EditConnector ', () => {
  let user: UserEvent;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime, pointerEventsCheck: 0 });

    usePushToServiceMock.mockReturnValue(usePushToServiceMockRes);
  });

  it('renders an error message correctly', async () => {
    usePushToServiceMock.mockReturnValue({
      ...usePushToServiceMockRes,
      errorsMsg: [errorMsg],
      hasErrorMessages: true,
    });

    renderWithTestingProviders(<EditConnector {...defaultProps} />);

    expect(await screen.findByText(errorMsg.description)).toBeInTheDocument();
  });

  it('calls onSubmit when changing connector', async () => {
    renderWithTestingProviders(<EditConnector {...defaultProps} />);

    await user.click(screen.getByTestId('connector-edit-button'));
    await user.click(screen.getByTestId('dropdown-connectors'));

    await waitFor(() => {
      expect(screen.getByTestId('dropdown-connector-resilient-2')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('dropdown-connector-resilient-2'));

    expect(screen.getByTestId('edit-connectors-submit')).toBeInTheDocument();

    await user.click(screen.getByTestId('edit-connectors-submit'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        fields: {
          incidentTypes: null,
          severityCode: null,
        },
        id: 'resilient-2',
        name: 'My Resilient connector',
        type: '.resilient',
      })
    );
  });

  it('should call handlePushToService when pushing to an external service', async () => {
    usePushToServiceMock.mockReturnValue({ ...usePushToServiceMockRes, needsToBePushed: true });
    const props = {
      ...defaultProps,
      caseData: {
        ...defaultProps.caseData,
        connector: {
          ...defaultProps.caseData.connector,
          id: 'servicenow-1',
        },
      },
    };

    renderWithTestingProviders(<EditConnector {...props} />);

    expect(await screen.findByTestId('push-to-external-service')).toBeInTheDocument();
    await user.click(screen.getByTestId('push-to-external-service'));

    await waitFor(() => expect(handlePushToService).toHaveBeenCalled());
  });

  it('reverts to the initial selection if the caseData do not change', async () => {
    const props = {
      ...defaultProps,
      caseData: {
        ...defaultProps.caseData,
        connector: {
          ...defaultProps.caseData.connector,
          id: 'servicenow-1',
        },
      },
    };

    renderWithTestingProviders(<EditConnector {...props} />);

    await user.click(screen.getByTestId('connector-edit-button'));
    await user.click(screen.getByTestId('dropdown-connectors'));

    await waitFor(() => {
      expect(screen.getByTestId('dropdown-connector-resilient-2')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('dropdown-connector-resilient-2'));

    await user.click(screen.getByTestId('edit-connectors-submit'));

    await waitFor(() => {
      expect(screen.queryByTestId('edit-connectors-submit')).not.toBeInTheDocument();
    });

    /**
     * As onSubmit do not change the case data
     * and we did not rerender the component with
     * new case data the initial selection should remain.
     * This simulates the case where an error occurred
     * when calling onSubmit.
     */
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('My SN connector')).toBeInTheDocument();
    });
  });

  it('resets to the initial connector onCancel', async () => {
    const props = {
      ...defaultProps,
      caseData: {
        ...defaultProps.caseData,
        connector: {
          ...defaultProps.caseData.connector,
          id: 'servicenow-1',
        },
      },
    };

    renderWithTestingProviders(<EditConnector {...props} />);

    await user.click(screen.getByTestId('connector-edit-button'));
    await user.click(screen.getByTestId('dropdown-connectors'));

    await waitFor(() => {
      expect(screen.getByTestId('dropdown-connector-resilient-2')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('dropdown-connector-resilient-2'));
    await user.click(screen.getByTestId('edit-connectors-cancel'));

    await waitFor(() => {
      expect(screen.queryByTestId('edit-connectors-submit')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('My SN connector')).toBeInTheDocument();
    });
  });

  it('disabled the edit button when is loading', async () => {
    const props = { ...defaultProps, isLoading: true };

    renderWithTestingProviders(<EditConnector {...props} />);

    await waitFor(() => {
      expect(screen.queryByTestId('connector-edit-button')).not.toBeInTheDocument();
    });
  });

  it('does not shows the callouts when is loading', async () => {
    const props = { ...defaultProps, isLoading: true };
    usePushToServiceMock.mockReturnValue({ ...usePushToServiceMockRes, errorsMsg: [errorMsg] });

    renderWithTestingProviders(<EditConnector {...props} />);

    await waitFor(() => {
      expect(screen.queryByTestId('push-callouts')).not.toBeInTheDocument();
    });
  });

  it('does not allow the connector to be edited when the user does not have write permissions', async () => {
    renderWithTestingProviders(<EditConnector {...defaultProps} />, {
      wrapperProps: { permissions: noCasesPermissions() },
    });

    await waitFor(() => {
      expect(screen.queryByTestId('connector-edit-button')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.queryByTestId('push-to-external-service')).not.toBeInTheDocument();
    });
  });

  it('shows the actions permission message if the user does not have read access to actions', async () => {
    const coreStart = coreMock.createStart();

    coreStart.application.capabilities = {
      ...coreStart.application.capabilities,
      actions: { save: false, show: false },
    };

    renderWithTestingProviders(<EditConnector {...defaultProps} />, {
      wrapperProps: { coreStart },
    });

    expect(await screen.findByTestId('edit-connector-permissions-error-msg')).toBeInTheDocument();
  });

  it('does not show the actions permission message if the user has read access to actions', async () => {
    const coreStart = coreMock.createStart();

    coreStart.application.capabilities = {
      ...coreStart.application.capabilities,
      actions: { save: true, show: true },
    };

    renderWithTestingProviders(<EditConnector {...defaultProps} />, {
      wrapperProps: { coreStart },
    });

    expect(screen.queryByTestId('edit-connector-permissions-error-msg')).not.toBeInTheDocument();
  });

  it('does not show the callout if the user does not have read access to actions', async () => {
    const props = { ...defaultProps, connectors: [] };
    const coreStart = coreMock.createStart();

    coreStart.application.capabilities = {
      ...coreStart.application.capabilities,
      actions: { save: false, show: false },
    };

    renderWithTestingProviders(<EditConnector {...props} />, {
      wrapperProps: { coreStart },
    });

    expect(await screen.findByTestId('edit-connector-permissions-error-msg')).toBeInTheDocument();
    expect(screen.queryByTestId('push-callouts')).not.toBeInTheDocument();
  });

  it('does not show the callouts if the user does not have access to cases connectors', async () => {
    usePushToServiceMock.mockReturnValue({ ...usePushToServiceMockRes, errorsMsg: [errorMsg] });
    const props = { ...defaultProps, connectors: [] };

    renderWithTestingProviders(<EditConnector {...props} />, {
      wrapperProps: { permissions: noConnectorsCasePermission() },
    });

    expect(screen.queryByTestId('push-callouts')).toBe(null);
  });

  it('does not show the connectors previewer if the user does not have read access to actions', async () => {
    const props = { ...defaultProps, connectors: [] };
    const coreStart = coreMock.createStart();

    coreStart.application.capabilities = {
      ...coreStart.application.capabilities,
      actions: { save: false, show: false },
    };

    renderWithTestingProviders(<EditConnector {...props} />, {
      wrapperProps: { coreStart },
    });
    expect(screen.queryByTestId('connector-fields-preview')).not.toBeInTheDocument();
  });

  it('does not show the connectors previewer if the user does not have access to cases connectors', async () => {
    const props = { ...defaultProps, connectors: [] };

    renderWithTestingProviders(<EditConnector {...props} />, {
      wrapperProps: { permissions: noConnectorsCasePermission() },
    });
    expect(screen.queryByTestId('connector-fields-preview')).not.toBeInTheDocument();
  });

  it('does not show the connectors form if the user does not have read access to actions', async () => {
    const props = { ...defaultProps, connectors: [] };
    const coreStart = coreMock.createStart();

    coreStart.application.capabilities = {
      ...coreStart.application.capabilities,
      actions: { save: false, show: false },
    };

    renderWithTestingProviders(<EditConnector {...props} />, {
      wrapperProps: { coreStart },
    });
    expect(screen.queryByTestId('edit-connector-fields-form-flex-item')).not.toBeInTheDocument();
  });

  it('does not show the connectors form if the user does not have access to cases connectors', async () => {
    const props = { ...defaultProps, connectors: [] };

    renderWithTestingProviders(<EditConnector {...props} />, {
      wrapperProps: { permissions: noConnectorsCasePermission() },
    });
    expect(screen.queryByTestId('edit-connector-fields-form-flex-item')).not.toBeInTheDocument();
  });

  it('does not show the push button if the user does not have read access to actions', async () => {
    const coreStart = coreMock.createStart();

    coreStart.application.capabilities = {
      ...coreStart.application.capabilities,
      actions: { save: false, show: false },
    };

    renderWithTestingProviders(<EditConnector {...defaultProps} />, {
      wrapperProps: { coreStart },
    });

    expect(screen.queryByTestId('push-to-external-service')).not.toBeInTheDocument();
  });

  it('does not show the push button if the user does not have push permissions', async () => {
    usePushToServiceMock.mockReturnValue({ ...usePushToServiceMockRes, hasPushPermissions: false });
    renderWithTestingProviders(<EditConnector {...defaultProps} />);

    expect(screen.queryByTestId('push-to-external-service')).not.toBeInTheDocument();
  });

  it('disable the push button when connector is invalid', async () => {
    usePushToServiceMock.mockReturnValue({ ...usePushToServiceMockRes, needsToBePushed: true });

    renderWithTestingProviders(
      <EditConnector
        {...defaultProps}
        caseData={{
          ...defaultProps.caseData,
          connector: { ...defaultProps.caseData.connector, id: 'not-exist' },
        }}
      />
    );

    expect(await screen.findByTestId('push-to-external-service')).toBeDisabled();
  });

  it('does not show the push button if the user does not have access to cases actions', async () => {
    renderWithTestingProviders(<EditConnector {...defaultProps} />, {
      wrapperProps: { permissions: noConnectorsCasePermission() },
    });

    expect(screen.queryByTestId('push-to-external-service')).not.toBeInTheDocument();
  });

  it('does not show the edit connectors pencil if the user does not have read access to actions', async () => {
    const props = { ...defaultProps, connectors: [] };
    const coreStart = coreMock.createStart();

    coreStart.application.capabilities = {
      ...coreStart.application.capabilities,
      actions: { save: false, show: false },
    };

    renderWithTestingProviders(<EditConnector {...props} />, {
      wrapperProps: { coreStart },
    });

    expect(await screen.findByTestId('connector-edit-header')).toBeInTheDocument();
    expect(screen.queryByTestId('connector-edit-button')).not.toBeInTheDocument();
  });

  it('does not show the edit connectors pencil if the user does not have access to case connectors', async () => {
    const props = { ...defaultProps, connectors: [] };

    renderWithTestingProviders(<EditConnector {...props} />, {
      wrapperProps: {
        permissions: noConnectorsCasePermission(),
      },
    });

    expect(await screen.findByTestId('connector-edit-header')).toBeInTheDocument();
    expect(screen.queryByTestId('connector-edit-button')).not.toBeInTheDocument();
  });

  it('does not show the edit connectors pencil if the user does not have push permissions', async () => {
    const props = { ...defaultProps, connectors: [] };
    usePushToServiceMock.mockReturnValue({ ...usePushToServiceMockRes, hasPushPermissions: false });

    renderWithTestingProviders(<EditConnector {...props} />);

    expect(await screen.findByTestId('connector-edit-header')).toBeInTheDocument();
    expect(screen.queryByTestId('connector-edit-button')).not.toBeInTheDocument();
  });

  it('should show the correct connector name on the push button', async () => {
    const props = {
      ...defaultProps,
      caseData: {
        ...defaultProps.caseData,
        connector: {
          id: 'resilient-2',
          name: 'old name',
          type: ConnectorTypes.resilient,
          fields: null,
        },
      },
    };

    renderWithTestingProviders(<EditConnector {...props} />);

    expect(await screen.findByText('Update My Resilient connector incident')).toBeInTheDocument();
  });
});
