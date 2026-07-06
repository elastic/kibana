/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { noConnectorsCasePermission, renderWithTestingProviders } from '../../../../../common/mock';
import { basicCase, connectorsMock } from '../../../../../containers/mock';
import { getCaseConnectorsMockResponse } from '../../../../../common/mock/connectors';
import type { ConnectorFieldProps } from './connector_field';
import { ConnectorField } from './connector_field';

const onSubmit = jest.fn();
const caseConnectors = getCaseConnectorsMockResponse();

const defaultProps: ConnectorFieldProps = {
  caseData: basicCase,
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
  });

  it('renders the connector selection directly, without an edit button', () => {
    renderWithTestingProviders(<ConnectorField {...defaultProps} />);

    expect(screen.getByTestId('caseConnectors')).toBeInTheDocument();
    expect(screen.queryByTestId('connector-edit-button')).not.toBeInTheDocument();
  });

  it('shows save and cancel buttons right away', () => {
    renderWithTestingProviders(<ConnectorField {...defaultProps} />);

    expect(screen.getByTestId('edit-connectors-submit')).toBeInTheDocument();
    expect(screen.getByTestId('edit-connectors-cancel')).toBeInTheDocument();
  });

  it('calls onSubmit when changing connector and saving', async () => {
    renderWithTestingProviders(<ConnectorField {...defaultProps} />);

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

    await user.click(screen.getByTestId('dropdown-connectors'));

    await waitFor(() => {
      expect(screen.getByTestId('dropdown-connector-resilient-2')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('dropdown-connector-resilient-2'));
    await user.click(screen.getByTestId('edit-connectors-cancel'));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the actions permission message when the user does not have access to case connectors', () => {
    renderWithTestingProviders(<ConnectorField {...defaultProps} />, {
      wrapperProps: { permissions: noConnectorsCasePermission() },
    });

    expect(screen.getByTestId('edit-connector-permissions-error-msg')).toBeInTheDocument();
    expect(screen.queryByTestId('caseConnectors')).not.toBeInTheDocument();
  });
});
