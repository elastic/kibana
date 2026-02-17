/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { connectorsMock } from '../../containers/mock';
import { Connector } from './connector';
import { useGetChoices } from '../connectors/servicenow/use_get_choices';
import { choices } from '../connectors/mock';
import { noConnectorsCasePermission, renderWithTestingProviders } from '../../common/mock';

import { FormTestComponent } from '../../common/test_utils';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { coreMock } from '@kbn/core/public/mocks';

jest.mock('../connectors/servicenow/use_get_choices');

const useGetChoicesMock = useGetChoices as jest.Mock;

const useGetChoicesResponse = {
  isLoading: false,
  choices,
};

const defaultProps = {
  connectors: connectorsMock,
  isLoading: false,
  isLoadingConnectors: false,
};

describe('Connector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useGetChoicesMock.mockReturnValue(useGetChoicesResponse);
  });

  it('renders correctly', async () => {
    renderWithTestingProviders(
      <FormTestComponent formDefaultValue={{ connectorId: 'none' }}>
        <Connector {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseConnectors')).toBeInTheDocument();
    expect(screen.queryByTestId('connector-fields')).not.toBeInTheDocument();
  });

  it('renders loading state correctly', async () => {
    renderWithTestingProviders(
      <FormTestComponent formDefaultValue={{ connectorId: 'none' }}>
        <Connector {...{ ...defaultProps, isLoading: true }} />
      </FormTestComponent>
    );

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    expect(await screen.findByLabelText('Loading')).toBeInTheDocument();
    expect(await screen.findByTestId('dropdown-connectors')).toBeDisabled();
  });

  it('renders default connector correctly', async () => {
    renderWithTestingProviders(
      <FormTestComponent formDefaultValue={{ connectorId: connectorsMock[2].id }}>
        <Connector {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseConnectors')).toBeInTheDocument();
    expect(await screen.findByText('Jira')).toBeInTheDocument();

    expect(await screen.findByTestId('connector-fields-jira')).toBeInTheDocument();
  });

  it('shows all connectors in dropdown', async () => {
    renderWithTestingProviders(
      <FormTestComponent formDefaultValue={{ connectorId: 'none' }}>
        <Connector {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseConnectors')).toBeInTheDocument();
    await userEvent.click(await screen.findByTestId('dropdown-connectors'));

    await waitForEuiPopoverOpen();

    expect(
      await screen.findByTestId(`dropdown-connector-${connectorsMock[0].id}`)
    ).toBeInTheDocument();
    expect(
      await screen.findByTestId(`dropdown-connector-${connectorsMock[1].id}`)
    ).toBeInTheDocument();
  });

  it('changes connector correctly', async () => {
    renderWithTestingProviders(
      <FormTestComponent formDefaultValue={{ connectorId: 'none' }}>
        <Connector {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseConnectors')).toBeInTheDocument();
    await userEvent.click(await screen.findByTestId('dropdown-connectors'));

    await waitForEuiPopoverOpen();

    await userEvent.click(await screen.findByTestId('dropdown-connector-resilient-2'));

    expect(await screen.findByTestId('connector-fields-resilient')).toBeInTheDocument();
  });

  it('shows the actions permission message if the user does not have read access to actions', async () => {
    const coreStart = coreMock.createStart();
    coreStart.application.capabilities = {
      ...coreStart.application.capabilities,
      actions: { save: false, show: false },
    };

    renderWithTestingProviders(
      <FormTestComponent formDefaultValue={{ connectorId: 'none' }}>
        <Connector {...defaultProps} />
      </FormTestComponent>,
      { wrapperProps: { coreStart } }
    );

    expect(
      await screen.findByTestId('create-case-connector-permissions-error-msg')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('caseConnectors')).not.toBeInTheDocument();
  });

  it('shows the actions permission message if the user does not have access to case connector', async () => {
    renderWithTestingProviders(
      <FormTestComponent formDefaultValue={{ connectorId: 'none' }}>
        <Connector {...defaultProps} />
      </FormTestComponent>,
      { wrapperProps: { permissions: noConnectorsCasePermission() } }
    );
    expect(screen.getByTestId('create-case-connector-permissions-error-msg')).toBeInTheDocument();
    expect(screen.queryByTestId('caseConnectors')).not.toBeInTheDocument();
  });
});
