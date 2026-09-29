/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiProvider } from '@elastic/eui';
import { AgentConnectors } from './agent_connectors';

vi.mock('../../../hooks/use_kibana', () => {
      const mocked = {
      useKibana: () => ({
        services: {
          plugins: {
            triggersActionsUi: {
              actionTypeRegistry: { has: () => false, get: () => ({}) },
            },
          },
        },
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../hooks/use_navigation', () => {
      const mocked = {
      useNavigation: () => ({ createAgentBuilderUrl: () => '#' }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../hooks/use_flyout_state', () => {
      const mocked = {
      useFlyoutState: () => ({ isOpen: false, openFlyout: vi.fn(), closeFlyout: vi.fn() }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../hooks/use_query_state');

vi.mock('../common/page_wrapper', () => {
      const mocked = {
      PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../common/styles', () => {
      const mocked = {
      useListDetailPageStyles: () => ({
        loadingSpinner: {},
        header: {},
        body: {},
        searchColumn: {},
        searchInputWrapper: {},
        scrollableList: {},
        detailPanelWrapper: {},
        noSelectionPlaceholder: {},
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./active_connector_row', () => {
      const mocked = {
      ActiveConnectorRow: () => <div data-test-subj="activeConnectorRow" />,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./connector_detail_panel', () => {
      const mocked = {
      ConnectorDetailPanel: vi.fn(() => <div data-test-subj="connectorDetailPanel" />),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./connector_library_panel', () => {
      const mocked = {
      ConnectorLibraryPanel: () => <div data-test-subj="connectorLibraryPanel" />,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./connectors_customize_empty_state', () => {
      const mocked = {
      ConnectorsCustomizeEmptyState: () => <div data-test-subj="connectorsCustomizeEmptyState" />,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../hooks/agents/use_agent_by_id');
vi.mock('../../../hooks/agents/use_can_update_agent');
vi.mock('../../../hooks/connectors/use_agent_connectors');
vi.mock('../../../hooks/use_has_connectors_all_privileges');
vi.mock('../../../context/connectors_provider');

const { useAgentBuilderAgentById } = (await vi.importMock('../../../hooks/agents/use_agent_by_id'));
const { useCanUpdateAgent } = (await vi.importMock('../../../hooks/agents/use_can_update_agent'));
const { useAgentConnectors } = (await vi.importMock('../../../hooks/connectors/use_agent_connectors'));
const { useHasConnectorsAllPrivileges } = (await vi.importMock('../../../hooks/use_has_connectors_all_privileges'));
const { useConnectorsActions } = (await vi.importMock('../../../context/connectors_provider'));
const { useQueryState } = (await vi.importMock('../../../hooks/use_query_state'));
const { ConnectorDetailPanel } = (await vi.importMock('./connector_detail_panel'));

const openCreateFlyout = vi.fn();

const renderComponent = () =>
  render(
    <EuiProvider>
      <IntlProvider locale="en">
        <AgentConnectors agentId="agent-1" />
      </IntlProvider>
    </EuiProvider>
  );

describe('AgentConnectors', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useQueryState.mockReturnValue([undefined, vi.fn()]);

    ConnectorDetailPanel.mockImplementation(() => <div data-test-subj="connectorDetailPanel" />);

    useAgentBuilderAgentById.mockReturnValue({
      agent: {
        id: 'agent-1',
        name: 'Test Agent',
        configuration: { connector_ids: ['c1'] },
      },
      isLoading: false,
      error: null,
    });

    useCanUpdateAgent.mockReturnValue(true);

    useAgentConnectors.mockReturnValue({
      assignedConnectors: [{ id: 'c1', name: 'Connector 1', actionTypeId: '.test' }],
      allConnectors: [{ id: 'c1', name: 'Connector 1', actionTypeId: '.test' }],
      activeConnectorIdSet: new Set(['c1']),
      isLoading: false,
      assign: vi.fn(),
      unassign: vi.fn(),
    });

    useHasConnectorsAllPrivileges.mockReturnValue(true);

    useConnectorsActions.mockReturnValue({ openCreateFlyout });
  });

  it('calls openCreateFlyout when "Create new connector" is clicked', async () => {
    const user = userEvent.setup();

    renderComponent();

    await user.click(screen.getByTestId('agentBuilderAddConnectorButton'));
    await user.click(screen.getByText('Create new connector'));

    expect(openCreateFlyout).toHaveBeenCalledTimes(1);
  });

  it('shows empty state when no connectors are assigned', () => {
    useAgentBuilderAgentById.mockReturnValue({
      agent: { id: 'agent-1', name: 'Test Agent', configuration: { connector_ids: [] } },
      isLoading: false,
      error: null,
    });
    useAgentConnectors.mockReturnValue({
      assignedConnectors: [],
      allConnectors: [],
      activeConnectorIdSet: new Set(),
      isLoading: false,
      assign: vi.fn(),
      unassign: vi.fn(),
    });

    renderComponent();

    expect(screen.getByTestId('connectorsCustomizeEmptyState')).toBeInTheDocument();
    expect(screen.queryByTestId('agentBuilderAddConnectorButton')).not.toBeInTheDocument();
  });

  it('shows detail panel when a connector is selected', () => {
    useQueryState.mockReturnValue(['c1', vi.fn()]);

    renderComponent();

    expect(screen.getByTestId('connectorDetailPanel')).toBeInTheDocument();
  });

  it('clears selection when the selected connector is removed', () => {
    const setSelectedConnectorId = vi.fn();
    useQueryState.mockReturnValue(['c1', setSelectedConnectorId]);
    const unassign = vi.fn();
    useAgentConnectors.mockReturnValue({
      assignedConnectors: [{ id: 'c1', name: 'Connector 1', actionTypeId: '.test' }],
      allConnectors: [{ id: 'c1', name: 'Connector 1', actionTypeId: '.test' }],
      activeConnectorIdSet: new Set(['c1']),
      isLoading: false,
      assign: vi.fn(),
      unassign,
    });

    renderComponent();

    const { onRemove } = ConnectorDetailPanel.mock.calls[0][0];
    onRemove({ id: 'c1', name: 'Connector 1', actionTypeId: '.test' });

    expect(unassign).toHaveBeenCalledWith({ id: 'c1', name: 'Connector 1', actionTypeId: '.test' });
    expect(setSelectedConnectorId).toHaveBeenCalledWith(null);
  });

  it('disables "From library" but not the main button when connector_ids is undefined', async () => {
    const user = userEvent.setup();

    useAgentBuilderAgentById.mockReturnValue({
      agent: { id: 'agent-1', name: 'Test Agent', configuration: {} },
      isLoading: false,
      error: null,
    });

    renderComponent();

    const mainButton = screen.getByTestId('agentBuilderAddConnectorButton');
    expect(mainButton).not.toBeDisabled();

    await user.click(mainButton);

    expect(screen.getByText('From library').closest('button')).toBeDisabled();
    expect(screen.getByText('Create new connector').closest('button')).not.toBeDisabled();
  });
});
