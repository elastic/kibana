/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { ConnectorSelect } from './connector_select';
import {
  createConnectorHttpGetMock,
  MOCK_RAW_CONNECTORS,
  MOCK_SUPPORTED_CONNECTOR_TYPES,
  expectConnectorQueriesLoaded,
} from './connector_test_helpers';

interface RenderConnectorSelectOptions {
  selectedConnectorIds?: string[];
  savedConnectorIds?: string[];
  onToggle?: jest.Mock;
  onOpenCreateConnector?: jest.Mock;
  canCreateConnector?: boolean;
  canReadConnectors?: boolean;
  disabled?: boolean;
  connectorsResponse?: typeof MOCK_RAW_CONNECTORS | Error;
  typesResponse?: typeof MOCK_SUPPORTED_CONNECTOR_TYPES | Error;
}

const renderConnectorSelect = ({
  selectedConnectorIds = [],
  savedConnectorIds = [],
  onToggle = jest.fn(),
  onOpenCreateConnector = jest.fn(),
  canCreateConnector = true,
  canReadConnectors = true,
  disabled = false,
  connectorsResponse = MOCK_RAW_CONNECTORS,
  typesResponse = MOCK_SUPPORTED_CONNECTOR_TYPES,
}: RenderConnectorSelectOptions = {}) => {
  const coreStart = coreMock.createStart();

  (coreStart.http.get as jest.Mock).mockImplementation(
    createConnectorHttpGetMock({ connectorsResponse, typesResponse })
  );

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: Infinity } },
  });

  render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider
          services={{ ...coreStart, triggersActionsUi: triggersActionsUiMock.createStart() }}
        >
          <QueryClientProvider client={queryClient}>
            <ConnectorSelect
              selectedConnectorIds={selectedConnectorIds}
              savedConnectorIds={savedConnectorIds}
              onToggle={onToggle}
              onOpenCreateConnector={onOpenCreateConnector}
              canCreateConnector={canCreateConnector}
              canReadConnectors={canReadConnectors}
              disabled={disabled}
            />
          </QueryClientProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );

  return { onToggle, onOpenCreateConnector, services: coreStart, queryClient };
};

const getConnectorCheckbox = (connectorId: string) =>
  screen.getByTestId(`contextConnectorCard-${connectorId}`);

const toggleConnectorCard = (connectorId: string) => {
  fireEvent.click(getConnectorCheckbox(connectorId));
};

describe('ConnectorSelect', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('requests connector types and connectors on mount when the user can read connectors', async () => {
    const { services, queryClient } = renderConnectorSelect();

    expect(screen.getByTestId('contextConnectorsTab')).toBeInTheDocument();
    expect(screen.getByTestId('contextConnectorsLoading')).toBeInTheDocument();

    await waitFor(() => {
      expect(services.http.get).toHaveBeenCalledWith(
        '/api/actions/connector_types',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
      expect(services.http.get).toHaveBeenCalledWith(
        '/api/actions/connectors',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });
    await waitFor(() => expectConnectorQueriesLoaded(queryClient));
  });

  it('shows a privilege callout and does not request connectors when the user cannot read connectors', () => {
    const { services } = renderConnectorSelect({
      canReadConnectors: false,
      canCreateConnector: false,
    });

    expect(screen.getByTestId('contextConnectorsMissingReadPrivilegeCallout')).toHaveTextContent(
      'You need Actions and Connectors read access to search and select connectors.'
    );
    expect(screen.queryByTestId('contextConnectorsLoading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextConnectorsEmpty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextConnectorsError')).not.toBeInTheDocument();
    expect(services.http.get).not.toHaveBeenCalled();
  });

  it('renders error prompt when loading failed', async () => {
    renderConnectorSelect({ connectorsResponse: new Error('Network error') });

    expect(await screen.findByTestId('contextConnectorsError')).toBeInTheDocument();
    expect(screen.getByText('Unable to load connectors')).toBeInTheDocument();
    expect(screen.queryByTestId('contextConnectorsEmpty')).not.toBeInTheDocument();
  });

  it('renders the create connector card when there are no connectors and the user can create', async () => {
    const { queryClient } = renderConnectorSelect({ connectorsResponse: [] });

    await waitFor(() => expectConnectorQueriesLoaded(queryClient));

    expect(screen.queryByTestId('contextConnectorsEmpty')).not.toBeInTheDocument();
    expect(screen.getByTestId('contextCreateConnectorCard')).toBeInTheDocument();
  });

  it('renders empty prompt when there are no connectors and the user cannot create', async () => {
    const { queryClient } = renderConnectorSelect({
      connectorsResponse: [],
      canCreateConnector: false,
    });

    await waitFor(() => expectConnectorQueriesLoaded(queryClient));

    expect(await screen.findByTestId('contextConnectorsEmpty')).toBeInTheDocument();
    expect(screen.queryByTestId('contextCreateConnectorCard')).not.toBeInTheDocument();
  });

  it('shows admin-contact copy in the empty state when the user cannot create connectors', async () => {
    const { queryClient } = renderConnectorSelect({
      connectorsResponse: [],
      canCreateConnector: false,
    });

    await waitFor(() => expectConnectorQueriesLoaded(queryClient));

    expect(
      await screen.findByText('No connectors yet. Ask your administrator to create one.')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('No connectors yet. Create one to use it as a source.')
    ).not.toBeInTheDocument();
  });

  it('lists one card per available connector', async () => {
    const { queryClient } = renderConnectorSelect();

    await waitFor(() => expectConnectorQueriesLoaded(queryClient));

    expect(screen.getByTestId('contextConnectorCard-connector-gdrive')).toBeInTheDocument();
    expect(screen.getByTestId('contextConnectorCard-connector-github')).toBeInTheDocument();
    expect(screen.getByTestId('contextConnectorCard-connector-notion')).toBeInTheDocument();
  });

  it('omits saved connectors from the grid', async () => {
    const { queryClient } = renderConnectorSelect({
      savedConnectorIds: ['connector-gdrive', 'connector-notion'],
    });

    await waitFor(() => expectConnectorQueriesLoaded(queryClient));

    expect(screen.queryByTestId('contextConnectorCard-connector-gdrive')).not.toBeInTheDocument();
    expect(screen.getByTestId('contextConnectorCard-connector-github')).toBeInTheDocument();
    expect(screen.queryByTestId('contextConnectorCard-connector-notion')).not.toBeInTheDocument();
  });

  it('reflects selected connectors in the card checkboxes', async () => {
    const { queryClient } = renderConnectorSelect({
      selectedConnectorIds: ['connector-gdrive', 'connector-notion'],
    });

    await waitFor(() => expectConnectorQueriesLoaded(queryClient));

    expect(getConnectorCheckbox('connector-gdrive')).toBeChecked();
    expect(getConnectorCheckbox('connector-github')).not.toBeChecked();
    expect(getConnectorCheckbox('connector-notion')).toBeChecked();
  });

  it('calls onToggle when a connector card checkbox is toggled', async () => {
    const { onToggle, queryClient } = renderConnectorSelect();

    await waitFor(() => expectConnectorQueriesLoaded(queryClient));
    toggleConnectorCard('connector-github');

    expect(onToggle).toHaveBeenCalledWith({
      id: 'connector-github',
      name: 'GitHub',
      checked: true,
    });
  });

  it('hides the create connector card when the user cannot create connectors', async () => {
    const { queryClient } = renderConnectorSelect({ canCreateConnector: false });

    await waitFor(() => expectConnectorQueriesLoaded(queryClient));

    expect(screen.getByTestId('contextConnectorsTab')).toBeInTheDocument();
    expect(screen.queryByTestId('contextCreateConnectorCard')).not.toBeInTheDocument();
  });

  it('calls onOpenCreateConnector when the create connector card is clicked', async () => {
    const { onOpenCreateConnector, queryClient } = renderConnectorSelect();

    await waitFor(() => expectConnectorQueriesLoaded(queryClient));
    fireEvent.click(screen.getByTestId('contextCreateConnectorCard'));

    expect(onOpenCreateConnector).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenCreateConnector from the create card when there are no connectors', async () => {
    const { onOpenCreateConnector, queryClient } = renderConnectorSelect({
      connectorsResponse: [],
    });

    await waitFor(() => expectConnectorQueriesLoaded(queryClient));
    fireEvent.click(screen.getByTestId('contextCreateConnectorCard'));

    expect(onOpenCreateConnector).toHaveBeenCalledTimes(1);
  });

  it('disables connector card checkboxes when disabled is true', async () => {
    const { queryClient } = renderConnectorSelect({ disabled: true });

    await waitFor(() => expectConnectorQueriesLoaded(queryClient));

    expect(getConnectorCheckbox('connector-github')).toBeDisabled();
  });

  it('disables the create connector card when disabled is true', async () => {
    const { onOpenCreateConnector, queryClient } = renderConnectorSelect({ disabled: true });

    await waitFor(() => expectConnectorQueriesLoaded(queryClient));

    const createCard = screen.getByTestId('contextCreateConnectorCard');
    expect(within(createCard).getByRole('button')).toBeDisabled();
    fireEvent.click(createCard);
    expect(onOpenCreateConnector).not.toHaveBeenCalled();
  });

  it('shows all-added empty copy and hides the select hint when every connector is already saved', async () => {
    const { queryClient } = renderConnectorSelect({
      savedConnectorIds: MOCK_RAW_CONNECTORS.map((connector) => connector.id),
      canCreateConnector: false,
    });

    await waitFor(() => expectConnectorQueriesLoaded(queryClient));

    expect(await screen.findByTestId('contextConnectorsEmpty')).toBeInTheDocument();
    expect(
      await screen.findByText('All installed connectors are already added.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Select one or more.')).not.toBeInTheDocument();
    MOCK_RAW_CONNECTORS.forEach((connector) => {
      expect(screen.queryByTestId(`contextConnectorCard-${connector.id}`)).not.toBeInTheDocument();
    });
  });
});
