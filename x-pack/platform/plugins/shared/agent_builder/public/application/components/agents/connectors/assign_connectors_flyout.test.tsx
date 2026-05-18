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
import { AssignConnectorsFlyout } from './assign_connectors_flyout';

const mockAssign = jest.fn();

jest.mock('../../../hooks/connectors/use_agent_connectors', () => ({
  useAgentConnectors: jest.fn(),
}));

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      plugins: {
        triggersActionsUi: {
          actionTypeRegistry: {
            has: () => false,
            get: () => ({ actionTypeTitle: '' }),
          },
        },
      },
    },
  }),
}));

jest.mock('../../connectors/connector_type_icon', () => ({
  ConnectorTypeIcon: () => <div data-test-subj="connectorTypeIcon" />,
}));

const { useAgentConnectors } = jest.requireMock('../../../hooks/connectors/use_agent_connectors');

const mockOnClose = jest.fn();

const renderWithIntl = (ui: React.ReactElement) =>
  render(
    <EuiProvider>
      <IntlProvider locale="en">{ui}</IntlProvider>
    </EuiProvider>
  );

const unassignedConnectors = [
  { id: 'c1', name: 'Connector 1', actionTypeId: '.email' },
  { id: 'c2', name: 'Connector 2', actionTypeId: '.slack' },
];

describe('AssignConnectorsFlyout', () => {
  beforeEach(() => {
    mockAssign.mockReset();
    mockOnClose.mockReset();
    useAgentConnectors.mockReturnValue({
      assign: mockAssign,
      isAssigning: false,
      unassignedConnectors,
    });
  });

  it('renders connector options in the combobox', async () => {
    const user = userEvent.setup();
    renderWithIntl(<AssignConnectorsFlyout agentId="agent-1" onClose={mockOnClose} />);

    await user.click(screen.getByRole('combobox'));

    expect(screen.getByText('Connector 1')).toBeInTheDocument();
    expect(screen.getByText('Connector 2')).toBeInTheDocument();
  });

  it('assign button is disabled when nothing is selected', () => {
    renderWithIntl(<AssignConnectorsFlyout agentId="agent-1" onClose={mockOnClose} />);

    expect(screen.getByText('Assign').closest('button')).toBeDisabled();
  });

  it('calls assign with selected connector id when Assign is clicked', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    mockAssign.mockResolvedValue(undefined);

    renderWithIntl(<AssignConnectorsFlyout agentId="agent-1" onClose={mockOnClose} />);

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('Connector 1'));
    await user.click(screen.getByText('Assign'));

    expect(mockAssign).toHaveBeenCalledWith('c1');
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    renderWithIntl(<AssignConnectorsFlyout agentId="agent-1" onClose={mockOnClose} />);

    await user.click(screen.getByText('Cancel'));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('shows Assign button in loading state when isAssigning is true', () => {
    useAgentConnectors.mockReturnValue({
      assign: mockAssign,
      isAssigning: true,
      unassignedConnectors,
    });

    renderWithIntl(<AssignConnectorsFlyout agentId="agent-1" onClose={mockOnClose} />);

    expect(screen.getByText('Assign').closest('button')).toBeDisabled();
  });
});
