/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiProvider } from '@elastic/eui';
import { AgentConnectors } from './agent_connectors';

jest.mock('../../connectors/table/connectors_table', () => ({
  AgentBuilderConnectorsTable: () => <div data-test-subj="agentBuilderConnectorsTable" />,
}));

jest.mock('../../../hooks/agents/use_agent_by_id', () => ({
  useAgentBuilderAgentById: () => ({
    agent: { id: 'agent-1', name: 'Test Agent', configuration: { connector_ids: [] } },
    isLoading: false,
    error: null,
  }),
}));

jest.mock('../../../hooks/connectors/use_agent_connectors', () => ({
  useAgentConnectors: () => ({
    assignedConnectors: [],
    unassignedConnectors: [],
    isLoading: false,
    error: null,
    assign: jest.fn(),
    isAssigning: false,
  }),
}));

const mockOpenCreateFlyout = jest.fn();

jest.mock('../../../context/connectors_provider', () => ({
  useConnectorsActions: () => ({
    openCreateFlyout: mockOpenCreateFlyout,
    editConnector: jest.fn(),
    deleteConnector: jest.fn(),
    bulkDeleteConnectors: jest.fn(),
    invalidateConnectors: jest.fn(),
  }),
}));

jest.mock('../../../hooks/use_has_connectors_all_privileges', () => ({
  useHasConnectorsAllPrivileges: jest.fn(),
}));

jest.mock('../common/styles', () => ({
  useListDetailPageStyles: () => ({ loadingSpinner: {} }),
}));

jest.mock('./assign_connectors_flyout', () => ({
  AssignConnectorsFlyout: () => <div data-test-subj="assignConnectorsFlyout" />,
}));

const renderWithIntl = (ui: React.ReactElement) =>
  render(
    <EuiProvider>
      <IntlProvider locale="en">{ui}</IntlProvider>
    </EuiProvider>
  );

const { useHasConnectorsAllPrivileges } = jest.requireMock(
  '../../../hooks/use_has_connectors_all_privileges'
);

describe('AgentConnectors', () => {
  beforeEach(() => {
    useHasConnectorsAllPrivileges.mockReturnValue(false);
    mockOpenCreateFlyout.mockReset();
  });

  it('renders the connectors page', () => {
    renderWithIntl(<AgentConnectors agentId="agent-1" />);

    expect(screen.getByTestId('agentBuilderConnectorsPage')).toBeInTheDocument();
  });

  it('opens the assign flyout when "Add existing connector" is clicked', async () => {
    const user = userEvent.setup();
    useHasConnectorsAllPrivileges.mockReturnValue(true);

    renderWithIntl(<AgentConnectors agentId="agent-1" />);

    await user.click(screen.getByText('Add connector'));
    await user.click(screen.getByText('Add existing connector'));

    expect(screen.getByTestId('assignConnectorsFlyout')).toBeInTheDocument();
  });

  it('calls mockOpenCreateFlyout when "Create new connector" is clicked', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    useHasConnectorsAllPrivileges.mockReturnValue(true);

    renderWithIntl(<AgentConnectors agentId="agent-1" />);

    await user.click(screen.getByText('Add connector'));
    await user.click(screen.getByText('Create new connector'));

    expect(mockOpenCreateFlyout).toHaveBeenCalledTimes(1);
  });
});
