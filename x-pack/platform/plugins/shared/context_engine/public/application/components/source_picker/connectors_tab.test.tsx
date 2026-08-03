/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { ConnectorsTab } from './connectors_tab';
import type { DataConnector } from '../../hooks/use_data_connectors';

const CONNECTORS: DataConnector[] = [
  { id: 'connector-gdrive', name: 'Google Drive' },
  { id: 'connector-github', name: 'GitHub' },
  { id: 'connector-notion', name: 'Notion' },
];

const CONNECTORS_DEEP_LINK_ID = 'triggersActionsConnectors';

interface RenderConnectorsTabOptions {
  connectors?: DataConnector[];
  isLoading?: boolean;
  isError?: boolean;
  selectedConnectorIds?: string[];
  onToggle?: jest.Mock;
}

const renderConnectorsTab = ({
  connectors = CONNECTORS,
  isLoading = false,
  isError = false,
  selectedConnectorIds = [],
  onToggle = jest.fn(),
}: RenderConnectorsTabOptions = {}) => {
  const services = coreMock.createStart();
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

  return { onToggle, services };
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

  it('navigates to the connectors management page from the empty-state create button', () => {
    const { services } = renderConnectorsTab({ connectors: [] });

    fireEvent.click(screen.getByTestId('contextCreateConnectorButton'));

    expect(services.application.navigateToApp).toHaveBeenCalledWith('management', {
      deepLinkId: CONNECTORS_DEEP_LINK_ID,
    });
  });

  it('navigates to the connectors management page from the create button below the list', () => {
    const { services } = renderConnectorsTab();

    fireEvent.click(screen.getByTestId('contextCreateConnectorButton'));

    expect(services.application.navigateToApp).toHaveBeenCalledWith('management', {
      deepLinkId: CONNECTORS_DEEP_LINK_ID,
    });
  });
});
