/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { screen, waitFor, within } from '@testing-library/react';
import { noConnectorsCasePermission, renderWithTestingProviders } from '../../../../../common/mock';
import { basicCase, connectorsMock } from '../../../../../containers/mock';
import { getCaseConnectorsMockResponse } from '../../../../../common/mock/connectors';
import type { ReturnUsePushToService } from '../../../../use_push_to_service';
import { usePushToService } from '../../../../use_push_to_service';
import type { ConnectorFieldProps } from './connector_field';
import { ConnectorField } from './connector_field';

jest.mock('../../../../use_push_to_service');

const onSubmit = jest.fn();
const handlePushToService = jest.fn();
const caseConnectors = getCaseConnectorsMockResponse();
const usePushToServiceMock = usePushToService as jest.Mock;

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

const defaultProps: ConnectorFieldProps = {
  caseData: {
    ...basicCase,
    connector: { ...basicCase.connector, id: 'servicenow-1' },
  },
  caseConnectors,
  supportedActionConnectors: connectorsMock,
  isLoading: false,
  onSubmit,
};

describe('ConnectorField', () => {
  let user: UserEvent;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime, pointerEventsCheck: 0 });
    usePushToServiceMock.mockReturnValue(usePushToServiceMockRes);
  });

  it('does not render its own "Connectors" header, since the accordion section already has one', () => {
    renderWithTestingProviders(<ConnectorField {...defaultProps} />);

    expect(screen.queryByTestId('connector-edit-header')).not.toBeInTheDocument();
  });

  it('does not render a stray divider above the content when there is no header row', () => {
    renderWithTestingProviders(<ConnectorField {...defaultProps} />);

    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });

  it('shows a preview with an edit button rather than the form right away', () => {
    renderWithTestingProviders(<ConnectorField {...defaultProps} />);

    expect(screen.getByTestId('connector-edit-button')).toBeInTheDocument();
    expect(screen.getByTestId('connector-edit-button')).toHaveTextContent('Edit');
    expect(screen.queryByTestId('caseConnectors')).not.toBeInTheDocument();
  });

  it('shows the edit and push buttons side by side, both in the outlined style', async () => {
    renderWithTestingProviders(<ConnectorField {...defaultProps} />);

    const actions = within(await screen.findByTestId('connector-outlined-actions'));
    const editButton = actions.getByTestId('connector-edit-button');
    const pushButton = actions.getByTestId('push-to-external-service');

    expect(editButton).toHaveClass('euiButton');
    expect(editButton).not.toHaveClass('euiButtonIcon');
    expect(pushButton).toHaveClass('euiButton');
    expect(pushButton).not.toHaveClass('euiButtonEmpty');
  });

  it('hides the edit button while the form is open, keeping only cancel/save', async () => {
    renderWithTestingProviders(<ConnectorField {...defaultProps} />);

    await user.click(screen.getByTestId('connector-edit-button'));

    expect(screen.queryByTestId('connector-edit-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('push-to-external-service')).not.toBeInTheDocument();
    expect(screen.getByTestId('edit-connectors-submit')).toBeInTheDocument();
    expect(screen.getByTestId('edit-connectors-cancel')).toBeInTheDocument();
  });

  it('calls onSubmit when changing connector and saving', async () => {
    renderWithTestingProviders(<ConnectorField {...defaultProps} />);

    await user.click(screen.getByTestId('connector-edit-button'));
    await user.click(screen.getByTestId('dropdown-connectors'));

    await waitFor(() => {
      expect(screen.getByTestId('dropdown-connector-resilient-2')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('dropdown-connector-resilient-2'));
    await user.click(screen.getByTestId('edit-connectors-submit'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        fields: {
          additionalFields: null,
          incidentTypes: null,
          severityCode: null,
        },
        id: 'resilient-2',
        name: 'My Resilient connector',
        type: '.resilient',
      })
    );
  });

  it('resets to the initial connector when cancel is clicked', async () => {
    renderWithTestingProviders(<ConnectorField {...defaultProps} />);

    await user.click(screen.getByTestId('connector-edit-button'));
    await user.click(screen.getByTestId('dropdown-connectors'));

    await waitFor(() => {
      expect(screen.getByTestId('dropdown-connector-resilient-2')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('dropdown-connector-resilient-2'));
    await user.click(screen.getByTestId('edit-connectors-cancel'));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not show the edit button when no connector is selected', () => {
    renderWithTestingProviders(<ConnectorField {...defaultProps} caseData={basicCase} />);

    expect(screen.queryByTestId('connector-edit-button')).not.toBeInTheDocument();
  });

  it('shows the actions permission message when the user does not have access to case connectors', () => {
    renderWithTestingProviders(<ConnectorField {...defaultProps} />, {
      wrapperProps: { permissions: noConnectorsCasePermission() },
    });

    expect(screen.getByTestId('edit-connector-permissions-error-msg')).toBeInTheDocument();
    expect(screen.queryByTestId('connector-edit-button')).not.toBeInTheDocument();
  });
});
