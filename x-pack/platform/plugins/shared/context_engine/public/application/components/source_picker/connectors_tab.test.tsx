/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { ContextEngineConnectorFeatureId } from '@kbn/actions-plugin/common';
import type { CoreStart } from '@kbn/core/public';
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
import { contextEngineQueryKeys } from '../../hooks/query_keys';

const getHttpPath = (pathOrOptions: string | { path: string }): string =>
  typeof pathOrOptions === 'string' ? pathOrOptions : pathOrOptions.path;

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

const SUPPORTED_TYPES = [
  { id: '.google_drive', name: 'Google Drive', supported_feature_ids: ['contextEngine'] },
  { id: '.github', name: 'GitHub', supported_feature_ids: ['contextEngine'] },
  { id: '.notion', name: 'Notion', supported_feature_ids: ['contextEngine'] },
];

const RAW_CONNECTORS = CONNECTORS.map((connector) => ({
  id: connector.id,
  name: connector.name,
  connector_type_id: connector.actionTypeId,
}));

interface RenderConnectorsTabOptions {
  selectedConnectorIds?: string[];
  onToggle?: jest.Mock;
  canCreateConnector?: boolean;
  canReadConnectors?: boolean;
  connectorsResponse?: typeof RAW_CONNECTORS | Error;
  typesResponse?: typeof SUPPORTED_TYPES | Error;
}

const renderConnectorsTab = ({
  selectedConnectorIds = [],
  onToggle = jest.fn(),
  canCreateConnector = true,
  canReadConnectors = true,
  connectorsResponse = RAW_CONNECTORS,
  typesResponse = SUPPORTED_TYPES,
}: RenderConnectorsTabOptions = {}) => {
  const coreStart = coreMock.createStart();
  coreStart.application.capabilities = {
    ...coreStart.application.capabilities,
    actions: {
      ...coreStart.application.capabilities.actions,
      save: canCreateConnector,
      show: canReadConnectors,
    },
  };

  (coreStart.http.get as jest.Mock).mockImplementation(
    (pathOrOptions: string | { path: string }) => {
      const path = getHttpPath(pathOrOptions);
      if (path === '/api/actions/connector_types') {
        if (typesResponse instanceof Error) {
          return Promise.reject(typesResponse);
        }
        return Promise.resolve(typesResponse);
      }
      if (path === '/api/actions/connectors') {
        if (connectorsResponse instanceof Error) {
          return Promise.reject(connectorsResponse);
        }
        return Promise.resolve(connectorsResponse);
      }
      return Promise.resolve(undefined);
    }
  );

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
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: Infinity } },
  });

  render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <QueryClientProvider client={queryClient}>
            <ConnectorsTab selectedConnectorIds={selectedConnectorIds} onToggle={onToggle} />
          </QueryClientProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );

  return { onToggle, services, getAddConnectorFlyout, queryClient };
};

const getConnectorComboBox = () => screen.getByTestId('contextConnectorComboBox');

const focusConnectorComboBox = () => {
  const comboBox = getConnectorComboBox();
  fireEvent.focus(within(comboBox).getByRole('combobox'));
};

const waitForConnectorQueries = async (queryClient: QueryClient) => {
  await waitFor(() => {
    const typesQuery = queryClient.getQueryState(contextEngineQueryKeys.connectors.types());
    const listQuery = queryClient.getQueryState(contextEngineQueryKeys.connectors.list());
    expect(typesQuery?.status).toBe('success');
    expect(listQuery?.status).toBe('success');
  });
};

const openConnectorOptions = async (
  services: Pick<CoreStart, 'http'>,
  queryClient: QueryClient,
  waitForOptionName?: string
) => {
  focusConnectorComboBox();
  await waitFor(() =>
    expect(services.http.get).toHaveBeenCalledWith(
      '/api/actions/connectors',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
  );
  await waitForConnectorQueries(queryClient);
  const comboBox = getConnectorComboBox();
  const input = within(comboBox).getByRole('combobox');
  fireEvent.focus(input);
  fireEvent.click(input);
  await waitFor(() => {
    if (waitForOptionName) {
      expect(screen.getByRole('option', { name: waitForOptionName })).toBeInTheDocument();
      return;
    }
    expect(screen.getAllByRole('option').length).toBeGreaterThan(0);
  });
};

const getConnectorOptionByName = (name: string) => screen.getByRole('option', { name });

describe('ConnectorsTab', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does not request connectors until the combo box is focused or searched', () => {
    const { services } = renderConnectorsTab();

    expect(screen.getByTestId('contextConnectorsTab')).toBeInTheDocument();
    expect(services.http.get).not.toHaveBeenCalled();
  });

  it('requests connectors when typing in the search box without a prior focus event', async () => {
    const { services } = renderConnectorsTab();

    const input = within(getConnectorComboBox()).getByTestId('comboBoxSearchInput');
    fireEvent.change(input, { target: { value: 'GitHub' } });

    await waitFor(() =>
      expect(services.http.get).toHaveBeenCalledWith(
        '/api/actions/connectors',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      )
    );
  });

  it('disables the combo and shows a privilege callout when the user cannot read connectors', () => {
    const { services } = renderConnectorsTab({
      canReadConnectors: false,
      canCreateConnector: false,
    });

    expect(screen.getByTestId('contextConnectorsMissingReadPrivilegeCallout')).toHaveTextContent(
      'You need Actions and Connectors read access to search and select connectors.'
    );
    expect(
      within(screen.getByTestId('contextConnectorComboBox')).getByRole('combobox')
    ).toBeDisabled();
    expect(screen.queryByTestId('contextConnectorsEmpty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextConnectorsError')).not.toBeInTheDocument();
    expect(services.http.get).not.toHaveBeenCalled();
  });

  it('renders error prompt when loading failed', async () => {
    renderConnectorsTab({ connectorsResponse: new Error('Network error') });

    focusConnectorComboBox();

    expect(await screen.findByTestId('contextConnectorsError')).toBeInTheDocument();
    expect(screen.getByText('Unable to load connectors')).toBeInTheDocument();
    expect(screen.queryByTestId('contextConnectorsEmpty')).not.toBeInTheDocument();
  });

  it('renders empty prompt with create button when there are no connectors', async () => {
    renderConnectorsTab({ connectorsResponse: [] });

    focusConnectorComboBox();

    expect(await screen.findByTestId('contextConnectorsEmpty')).toBeInTheDocument();
    expect(screen.getByTestId('contextCreateConnectorButton')).toBeInTheDocument();
  });

  it('hides the create button when the user cannot save connectors', async () => {
    renderConnectorsTab({ connectorsResponse: [], canCreateConnector: false });

    focusConnectorComboBox();

    expect(await screen.findByTestId('contextConnectorsEmpty')).toBeInTheDocument();
    expect(screen.queryByTestId('contextCreateConnectorButton')).not.toBeInTheDocument();
  });

  it('shows admin-contact copy in the empty state when the user cannot save connectors', async () => {
    renderConnectorsTab({ connectorsResponse: [], canCreateConnector: false });

    focusConnectorComboBox();

    expect(
      await screen.findByText('No connectors yet. Ask your administrator to create one.')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('No connectors yet. Create one to use it as a source.')
    ).not.toBeInTheDocument();
  });

  it('hides the create button footer when the user cannot save connectors', async () => {
    const { services, queryClient } = renderConnectorsTab({ canCreateConnector: false });

    await openConnectorOptions(services, queryClient);

    const connectorsTab = screen.getByTestId('contextConnectorsTab');
    expect(connectorsTab).toBeInTheDocument();
    expect(screen.queryByTestId('contextCreateConnectorButton')).not.toBeInTheDocument();
    expect(connectorsTab.querySelector('hr')).not.toBeInTheDocument();
  });

  it('lists one option per unselected connector in the combo box', async () => {
    const { services, queryClient } = renderConnectorsTab();

    await openConnectorOptions(services, queryClient);

    for (const connector of CONNECTORS) {
      expect(getConnectorOptionByName(connector.name)).toBeInTheDocument();
    }
  });

  it('omits already selected connectors from the combo box options', async () => {
    const { services, queryClient } = renderConnectorsTab({
      selectedConnectorIds: ['connector-gdrive', 'connector-notion'],
    });

    await openConnectorOptions(services, queryClient, 'GitHub');

    expect(screen.queryByRole('option', { name: 'Google Drive' })).not.toBeInTheDocument();
    expect(getConnectorOptionByName('GitHub')).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Notion' })).not.toBeInTheDocument();
  });

  it('calls onToggle with checked true when a connector is selected from the combo box', async () => {
    const { onToggle, services, queryClient } = renderConnectorsTab();

    await openConnectorOptions(services, queryClient);
    fireEvent.click(getConnectorOptionByName('GitHub'));

    expect(onToggle).toHaveBeenCalledWith({
      id: 'connector-github',
      name: 'GitHub',
      checked: true,
    });
  });

  it('filters visible connector options when typing without refetching the connector list', async () => {
    const { services, queryClient } = renderConnectorsTab();

    await openConnectorOptions(services, queryClient);

    const connectorCallsAfterOpen = (services.http.get as jest.Mock).mock.calls.filter(
      ([pathOrOptions]) => getHttpPath(pathOrOptions) === '/api/actions/connectors'
    ).length;

    const input = within(getConnectorComboBox()).getByTestId('comboBoxSearchInput');
    fireEvent.change(input, { target: { value: 'GitHub' } });

    await waitFor(() => {
      expect(getConnectorOptionByName('GitHub')).toBeInTheDocument();
    });

    expect(
      (services.http.get as jest.Mock).mock.calls.filter(
        ([pathOrOptions]) => getHttpPath(pathOrOptions) === '/api/actions/connectors'
      ).length
    ).toBe(connectorCallsAfterOpen);
    expect(screen.queryByRole('option', { name: 'Google Drive' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Notion' })).not.toBeInTheDocument();
  });

  it('opens the create connector flyout from the empty-state create button', async () => {
    const { getAddConnectorFlyout } = renderConnectorsTab({ connectorsResponse: [] });

    focusConnectorComboBox();
    await screen.findByTestId('contextConnectorsEmpty');

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
    const { getAddConnectorFlyout, services, queryClient } = renderConnectorsTab();

    await openConnectorOptions(services, queryClient);

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
      connectorsResponse: [],
    });
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');

    focusConnectorComboBox();
    await screen.findByTestId('contextConnectorsEmpty');

    fireEvent.click(screen.getByTestId('contextCreateConnectorButton'));

    const flyoutProps = getAddConnectorFlyout.mock.calls.at(-1)?.[0];
    act(() => {
      flyoutProps?.onConnectorCreated?.(CREATED_CONNECTOR);
      flyoutProps?.onClose?.();
    });

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['context_engine', 'connectors', 'list'],
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
      connectorsResponse: [],
    });
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');

    focusConnectorComboBox();
    await screen.findByTestId('contextConnectorsEmpty');

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
    expect(screen.getByTestId('contextCreateConnectorFlyout')).toBeInTheDocument();
  });

  it('invalidates connector queries when the flyout closes after save and test', async () => {
    const { getAddConnectorFlyout, queryClient } = renderConnectorsTab({ connectorsResponse: [] });
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');

    focusConnectorComboBox();
    await screen.findByTestId('contextConnectorsEmpty');

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

  it('passes flyout handlers for create, close, and save and test', async () => {
    const { getAddConnectorFlyout } = renderConnectorsTab({ connectorsResponse: [] });

    focusConnectorComboBox();
    await screen.findByTestId('contextConnectorsEmpty');

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
