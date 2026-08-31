/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { ContextEngineConnectorFeatureId } from '@kbn/actions-plugin/common';
import { coreMock } from '@kbn/core/public/mocks';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { ActionConnector } from '@kbn/alerts-ui-shared';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { ConnectorsTab } from './connectors_tab';
import type { DataConnector } from '../../hooks/use_data_connectors';

type AddConnectorFlyoutProps = Parameters<
  TriggersAndActionsUIPublicPluginStart['getAddConnectorFlyout']
>[0];

const CREATED_CONNECTOR: ActionConnector = {
  id: 'new-connector',
  name: 'New Connector',
  actionTypeId: '.notion',
  isMissingSecrets: false,
  isPreconfigured: false,
  isDeprecated: false,
  isSystemAction: false,
  isConnectorTypeDeprecated: false,
  config: {},
  secrets: {},
};

const CONNECTORS: DataConnector[] = [
  { id: 'connector-gdrive', name: 'Google Drive', actionTypeId: '.google_drive' },
  { id: 'connector-github', name: 'GitHub', actionTypeId: '.github' },
  { id: 'connector-notion', name: 'Notion', actionTypeId: '.notion' },
];

interface RenderConnectorsTabOptions {
  connectors?: DataConnector[];
  isLoading?: boolean;
  isError?: boolean;
  selectedConnectorIds?: string[];
  onToggle?: jest.Mock;
  canCreateConnector?: boolean;
}

const renderConnectorsTab = ({
  connectors = CONNECTORS,
  isLoading = false,
  isError = false,
  selectedConnectorIds = [],
  onToggle = jest.fn(),
  canCreateConnector = true,
}: RenderConnectorsTabOptions = {}) => {
  const coreStart = coreMock.createStart();
  coreStart.application.capabilities = {
    ...coreStart.application.capabilities,
    actions: {
      ...coreStart.application.capabilities.actions,
      save: canCreateConnector,
    },
  };

  const getAddConnectorFlyout = jest.fn((_props: AddConnectorFlyoutProps) => (
    <div data-test-subj="contextCreateConnectorFlyout">Create connector flyout</div>
  ));

  const services = {
    ...coreStart,
    triggersActionsUi: {
      ...triggersActionsUiMock.createStart(),
      getAddConnectorFlyout,
    },
  };
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <QueryClientProvider client={queryClient}>
            <ConnectorsTab
              connectors={connectors}
              isLoading={isLoading}
              isError={isError}
              selectedConnectorIds={selectedConnectorIds}
              onToggle={onToggle}
            />
          </QueryClientProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );

  return { onToggle, services, getAddConnectorFlyout, queryClient };
};

const getConnectorOption = (connectorId: string) =>
  screen.getByTestId(`contextConnectorOption-${connectorId}`);

describe('ConnectorsTab', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading skeleton and neither the selectable list nor the empty prompt when loading', () => {
    renderConnectorsTab({ isLoading: true });

    expect(screen.getByTestId('contextConnectorsLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('contextConnectorsSelectable')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextConnectorsEmpty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextConnectorsError')).not.toBeInTheDocument();
  });

  it('renders error prompt instead of the empty prompt when loading failed', () => {
    renderConnectorsTab({ connectors: [], isError: true });

    expect(screen.getByTestId('contextConnectorsError')).toBeInTheDocument();
    expect(screen.getByText('Unable to load connectors')).toBeInTheDocument();
    expect(screen.queryByTestId('contextConnectorsEmpty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextCreateConnectorButton')).not.toBeInTheDocument();
  });

  it('renders empty prompt with create button when there are no connectors', () => {
    renderConnectorsTab({ connectors: [] });

    expect(screen.getByTestId('contextConnectorsEmpty')).toBeInTheDocument();
    expect(screen.getByTestId('contextCreateConnectorButton')).toBeInTheDocument();
    expect(screen.queryByTestId('contextConnectorsTab')).not.toBeInTheDocument();
  });

  it('hides the create button when the user cannot save connectors', () => {
    renderConnectorsTab({ connectors: [], canCreateConnector: false });

    expect(screen.getByTestId('contextConnectorsEmpty')).toBeInTheDocument();
    expect(screen.queryByTestId('contextCreateConnectorButton')).not.toBeInTheDocument();
  });

  it('shows admin-contact copy in the empty state when the user cannot save connectors', () => {
    renderConnectorsTab({ connectors: [], canCreateConnector: false });

    expect(screen.getByText('Ask your administrator to create a connector.')).toBeInTheDocument();
    expect(screen.queryByText('Create a connector to use it as a source.')).not.toBeInTheDocument();
  });

  it('hides the create button footer when the user cannot save connectors', () => {
    renderConnectorsTab({ canCreateConnector: false });

    const connectorsTab = screen.getByTestId('contextConnectorsTab');
    expect(connectorsTab).toBeInTheDocument();
    expect(screen.queryByTestId('contextCreateConnectorButton')).not.toBeInTheDocument();
    expect(connectorsTab.querySelector('hr')).not.toBeInTheDocument();
  });

  it('renders one option per connector showing each connector name', () => {
    renderConnectorsTab();

    expect(screen.getByTestId('contextConnectorsTab')).toBeInTheDocument();

    for (const connector of CONNECTORS) {
      const option = getConnectorOption(connector.id);
      expect(option).toBeInTheDocument();
      expect(option).toHaveTextContent(connector.name);
    }
  });

  it('marks selected connectors as checked and leaves others unchecked', () => {
    renderConnectorsTab({ selectedConnectorIds: ['connector-gdrive', 'connector-notion'] });

    expect(getConnectorOption('connector-gdrive')).toHaveAttribute('aria-checked', 'true');
    expect(getConnectorOption('connector-github')).toHaveAttribute('aria-checked', 'false');
    expect(getConnectorOption('connector-notion')).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onToggle with checked true when an unselected connector is clicked', () => {
    const { onToggle } = renderConnectorsTab();

    fireEvent.click(getConnectorOption('connector-github'));

    expect(onToggle).toHaveBeenCalledWith({
      id: 'connector-github',
      name: 'GitHub',
      checked: true,
    });
  });

  it('calls onToggle with checked false when a selected connector is clicked', () => {
    const { onToggle } = renderConnectorsTab({ selectedConnectorIds: ['connector-gdrive'] });

    fireEvent.click(getConnectorOption('connector-gdrive'));

    expect(onToggle).toHaveBeenCalledWith({
      id: 'connector-gdrive',
      name: 'Google Drive',
      checked: false,
    });
  });

  it('filters visible connector options when typing in the search box', () => {
    renderConnectorsTab();

    const selectable = screen.getByTestId('contextConnectorsSelectable');
    const searchInput = within(selectable).getByRole('searchbox');

    fireEvent.change(searchInput, { target: { value: 'GitHub' } });

    expect(getConnectorOption('connector-github')).toBeInTheDocument();
    expect(screen.queryByTestId('contextConnectorOption-connector-gdrive')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextConnectorOption-connector-notion')).not.toBeInTheDocument();
  });

  it('opens the create connector flyout from the empty-state create button', async () => {
    const { getAddConnectorFlyout } = renderConnectorsTab({ connectors: [] });

    expect(screen.queryByTestId('contextCreateConnectorFlyout')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('contextCreateConnectorButton'));

    await waitFor(() =>
      expect(screen.getByTestId('contextCreateConnectorFlyout')).toBeInTheDocument()
    );
    expect(getAddConnectorFlyout).toHaveBeenCalledWith(
      expect.objectContaining({
        featureId: ContextEngineConnectorFeatureId,
      })
    );
  });

  it('opens the create connector flyout from the create button below the list', async () => {
    const { getAddConnectorFlyout } = renderConnectorsTab();

    fireEvent.click(screen.getByTestId('contextCreateConnectorButton'));

    await waitFor(() =>
      expect(screen.getByTestId('contextCreateConnectorFlyout')).toBeInTheDocument()
    );
    expect(getAddConnectorFlyout).toHaveBeenCalledWith(
      expect.objectContaining({
        featureId: ContextEngineConnectorFeatureId,
      })
    );
  });

  it('selects the created connector, invalidates queries, and closes the flyout on save', async () => {
    const { getAddConnectorFlyout, onToggle, queryClient } = renderConnectorsTab({
      connectors: [],
    });
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');

    fireEvent.click(screen.getByTestId('contextCreateConnectorButton'));

    const flyoutProps = getAddConnectorFlyout.mock.calls.at(-1)?.[0];
    act(() => {
      flyoutProps?.onConnectorCreated?.(CREATED_CONNECTOR);
      flyoutProps?.onClose?.();
    });

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['context_engine', 'connectors', 'list'],
    });
    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: ['context_engine', 'connectors', 'types'],
    });
    expect(onToggle).toHaveBeenCalledWith({
      id: 'new-connector',
      name: 'New Connector',
      checked: true,
    });
    await waitFor(() =>
      expect(screen.queryByTestId('contextCreateConnectorFlyout')).not.toBeInTheDocument()
    );
  });

  it('selects the created connector and keeps the flyout open on save and test', async () => {
    const { getAddConnectorFlyout, onToggle, queryClient } = renderConnectorsTab({
      connectors: [],
    });
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');

    fireEvent.click(screen.getByTestId('contextCreateConnectorButton'));

    const flyoutProps = getAddConnectorFlyout.mock.calls.at(-1)?.[0];
    act(() => {
      flyoutProps?.onConnectorCreated?.(CREATED_CONNECTOR);
      flyoutProps?.onTestConnector?.(CREATED_CONNECTOR);
    });

    expect(onToggle).toHaveBeenCalledWith({
      id: 'new-connector',
      name: 'New Connector',
      checked: true,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['context_engine', 'connectors', 'list'],
    });
    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: ['context_engine', 'connectors', 'types'],
    });
    expect(screen.getByTestId('contextCreateConnectorFlyout')).toBeInTheDocument();
  });

  it('invalidates connector queries when the flyout closes after save and test', () => {
    const { getAddConnectorFlyout, queryClient } = renderConnectorsTab({ connectors: [] });
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');

    fireEvent.click(screen.getByTestId('contextCreateConnectorButton'));

    const flyoutProps = getAddConnectorFlyout.mock.calls.at(-1)?.[0];
    act(() => {
      flyoutProps?.onConnectorCreated?.(CREATED_CONNECTOR);
      flyoutProps?.onTestConnector?.(CREATED_CONNECTOR);
    });

    invalidateQueries.mockClear();

    act(() => {
      flyoutProps?.onClose?.();
    });

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['context_engine', 'connectors', 'list'],
    });
  });

  it('passes flyout handlers for create, close, and save and test', () => {
    const { getAddConnectorFlyout } = renderConnectorsTab({ connectors: [] });

    fireEvent.click(screen.getByTestId('contextCreateConnectorButton'));

    expect(getAddConnectorFlyout).toHaveBeenCalledWith(
      expect.objectContaining({
        featureId: ContextEngineConnectorFeatureId,
        onClose: expect.any(Function),
        onConnectorCreated: expect.any(Function),
        onTestConnector: expect.any(Function),
      })
    );
  });
});
