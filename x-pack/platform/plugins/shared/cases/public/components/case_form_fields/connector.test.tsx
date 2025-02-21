/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AppMockRenderer } from '../../common/mock';
import { connectorsMock } from '../../containers/mock';
import { Connector } from './connector';
import { useGetIncidentTypes } from '../connectors/resilient/use_get_incident_types';
import { useGetSeverity } from '../connectors/resilient/use_get_severity';
import { useGetChoices } from '../connectors/servicenow/use_get_choices';
import { incidentTypes, severity, choices } from '../connectors/mock';
import { noConnectorsCasePermission, createAppMockRenderer } from '../../common/mock';

import { FormTestComponent } from '../../common/test_utils';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';

jest.mock('../connectors/resilient/use_get_incident_types');
jest.mock('../connectors/resilient/use_get_severity');
jest.mock('../connectors/servicenow/use_get_choices');

const useGetIncidentTypesMock = useGetIncidentTypes as jest.Mock;
const useGetSeverityMock = useGetSeverity as jest.Mock;
const useGetChoicesMock = useGetChoices as jest.Mock;

const useGetIncidentTypesResponse = {
  isLoading: false,
  incidentTypes,
};

const useGetSeverityResponse = {
  isLoading: false,
  severity,
};

const useGetChoicesResponse = {
  isLoading: false,
  choices,
};

const defaultProps = {
  connectors: connectorsMock,
  isLoading: false,
  isLoadingConnectors: false,
};

// FLAKY: https://github.com/elastic/kibana/issues/208443
describe.skip('Connector', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
    useGetIncidentTypesMock.mockReturnValue(useGetIncidentTypesResponse);
    useGetSeverityMock.mockReturnValue(useGetSeverityResponse);
    useGetChoicesMock.mockReturnValue(useGetChoicesResponse);
  });

  it('renders correctly', async () => {
    appMockRender.render(
      <FormTestComponent formDefaultValue={{ connectorId: 'none' }}>
        <Connector {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseConnectors')).toBeInTheDocument();
    expect(screen.queryByTestId('connector-fields')).not.toBeInTheDocument();
  });

  it('renders loading state correctly', async () => {
    appMockRender.render(
      <FormTestComponent formDefaultValue={{ connectorId: 'none' }}>
        <Connector {...{ ...defaultProps, isLoading: true }} />
      </FormTestComponent>
    );

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    expect(await screen.findByLabelText('Loading')).toBeInTheDocument();
    expect(await screen.findByTestId('dropdown-connectors')).toBeDisabled();
  });

  it('renders default connector correctly', async () => {
    appMockRender.render(
      <FormTestComponent formDefaultValue={{ connectorId: connectorsMock[2].id }}>
        <Connector {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseConnectors')).toBeInTheDocument();
    expect(await screen.findByText('Jira')).toBeInTheDocument();

    expect(await screen.findByTestId('connector-fields-jira')).toBeInTheDocument();
  });

  it('shows all connectors in dropdown', async () => {
    appMockRender.render(
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
    appMockRender.render(
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
    appMockRender.coreStart.application.capabilities = {
      ...appMockRender.coreStart.application.capabilities,
      actions: { save: false, show: false },
    };

    appMockRender.render(
      <FormTestComponent formDefaultValue={{ connectorId: 'none' }}>
        <Connector {...defaultProps} />
      </FormTestComponent>
    );
    expect(
      await screen.findByTestId('create-case-connector-permissions-error-msg')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('caseConnectors')).not.toBeInTheDocument();
  });

  it('shows the actions permission message if the user does not have access to case connector', async () => {
    appMockRender = createAppMockRenderer({ permissions: noConnectorsCasePermission() });

    appMockRender.render(
      <FormTestComponent formDefaultValue={{ connectorId: 'none' }}>
        <Connector {...defaultProps} />
      </FormTestComponent>
    );
    expect(screen.getByTestId('create-case-connector-permissions-error-msg')).toBeInTheDocument();
    expect(screen.queryByTestId('caseConnectors')).not.toBeInTheDocument();
  });
});
