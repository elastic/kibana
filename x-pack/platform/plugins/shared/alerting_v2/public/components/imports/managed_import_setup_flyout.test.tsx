/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CreateImportResponse } from '@kbn/alerting-v2-schemas';
import { I18nProvider } from '@kbn/i18n-react';
import { MockLocatorProvider } from '../../test_utils/test_providers';
import { ManagedImportSetupFlyout } from './managed_import_setup_flyout';
import type { ImportSource } from './import_sources';

const mockCreateImport = jest.fn();
const mockResetCreate = jest.fn();
const mockRotateToken = jest.fn();
const mockTestImport = jest.fn();
const mockInvalidateQueries = jest.fn();
const mockGetAddConnectorFlyout = jest.fn();
const mockGetEditConnectorFlyout = jest.fn();

interface TestConnector {
  id: string;
  name: string;
  actionTypeId: string;
  isInboundEventsEnabled?: boolean;
}

let mockConnectorsState: { data: TestConnector[] | undefined; isLoading: boolean } = {
  data: [],
  isLoading: false,
};
let mockImportedConnectorIds: string[] = [];

jest.mock('@kbn/core-di-browser', () => {
  const { PluginStart } = jest.requireActual('@kbn/core-di');
  const triggersActionsUiToken = PluginStart('triggersActionsUi');
  return {
    useService: (token: unknown) => {
      if (token === 'userProfile') {
        return {
          getCurrent: () =>
            Promise.resolve({ user: { username: 'elastic', full_name: 'Elastic User' } }),
        };
      }
      if (token === triggersActionsUiToken) {
        return {
          getAddConnectorFlyout: mockGetAddConnectorFlyout,
          getEditConnectorFlyout: mockGetEditConnectorFlyout,
        };
      }
      return {};
    },
    CoreStart: (key: string) => key,
  };
});

jest.mock('@kbn/react-query', () => ({
  ...jest.requireActual('@kbn/react-query'),
  useQuery: () => ({
    data: { items: mockImportedConnectorIds.map((id) => ({ connector_id: id })) },
    isLoading: false,
  }),
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

jest.mock('../../hooks/use_connectors_of_type', () => ({
  useConnectorsOfType: () => mockConnectorsState,
}));

jest.mock('../../hooks/use_create_import', () => ({
  useCreateImport: () => ({
    mutate: mockCreateImport,
    reset: mockResetCreate,
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

jest.mock('../../hooks/use_rotate_import_token', () => ({
  useRotateImportToken: () => ({ mutate: mockRotateToken, isLoading: false }),
}));

jest.mock('../../hooks/use_test_import', () => ({
  useTestImport: () => ({
    mutate: mockTestImport,
    reset: jest.fn(),
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null,
  }),
}));

const SOURCE: ImportSource = {
  id: '.datadog',
  kind: 'connector',
  title: 'Datadog',
  description: 'Datadog monitors',
  iconConnectorTypeId: '.datadog',
};

const CREATED: CreateImportResponse = {
  import: {
    id: 'dd-1',
    name: 'Datadog (prod)',
    kind: 'managed',
    enabled: true,
    source: 'datadog',
    connector_id: 'dd-1',
    connector_type_id: '.datadog',
    workflow_id: 'system-datadog-alert-translation',
    tags: [],
    routing_tags: [],
    created_by: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_by: null,
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  url: 'https://kibana.test/api/actions/events/.datadog/dd-1',
  public_base_url_configured: true,
};

const connector = (overrides: Partial<TestConnector> = {}): TestConnector => ({
  id: 'dd-1',
  name: 'Datadog (prod)',
  actionTypeId: '.datadog',
  isInboundEventsEnabled: true,
  ...overrides,
});

const renderFlyout = () => {
  const onClose = jest.fn();
  const onBack = jest.fn();
  const onCreated = jest.fn();
  render(
    <I18nProvider>
      <MockLocatorProvider>
        <ManagedImportSetupFlyout
          source={SOURCE}
          onClose={onClose}
          onBack={onBack}
          onCreated={onCreated}
        />
      </MockLocatorProvider>
    </I18nProvider>
  );
  return { onClose, onBack, onCreated };
};

describe('ManagedImportSetupFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectorsState = { data: [], isLoading: false };
    mockImportedConnectorIds = [];
    mockGetAddConnectorFlyout.mockImplementation(
      (props: { onConnectorCreated: (created: { id: string }) => void }) => (
        <div data-test-subj="mockAddConnectorFlyout">
          <button type="button" onClick={() => props.onConnectorCreated({ id: 'dd-new' })}>
            save connector
          </button>
        </div>
      )
    );
    mockGetEditConnectorFlyout.mockImplementation(() => (
      <div data-test-subj="mockEditConnectorFlyout" />
    ));
  });

  it('asks to create a connector when there is none, with receiving events on by default', async () => {
    const user = userEvent.setup();
    renderFlyout();

    expect(screen.getByTestId('importsManagedNoConnector')).toHaveTextContent(
      'Create a Datadog connector to get started'
    );
    await user.click(screen.getByTestId('importsManagedCreateConnector'));

    expect(mockGetAddConnectorFlyout).toHaveBeenCalledWith(
      expect.objectContaining({
        featureId: 'importAlerts',
        initialConnector: { actionTypeId: '.datadog', isInboundEventsEnabled: true },
      })
    );
    await user.click(screen.getByText('save connector'));
    expect(mockInvalidateQueries).toHaveBeenCalled();
  });

  it('picks the only existing connector, names the import after it and creates a managed import', async () => {
    const user = userEvent.setup();
    mockConnectorsState = { data: [connector()], isLoading: false };
    mockCreateImport.mockImplementation((_data, options) => options.onSuccess(CREATED));
    const { onCreated } = renderFlyout();

    await waitFor(() =>
      expect(screen.getByTestId('importsManagedFormName')).toHaveValue('Datadog (prod)')
    );
    await waitFor(() => expect(screen.getByTestId('importsManagedSetupSubmit')).toBeEnabled());
    await user.click(screen.getByTestId('importsManagedSetupSubmit'));

    expect(mockCreateImport.mock.calls[0][0]).toEqual({
      kind: 'managed',
      connector_id: 'dd-1',
      name: 'Datadog (prod)',
      owner: 'Elastic User',
    });
    expect(onCreated).toHaveBeenCalled();
    expect(screen.getByTestId('importsManagedSetupTitle')).toHaveTextContent('Connect Datadog');
  });

  it('shows the webhook URL and a Rotate token button, not a token, after creating', async () => {
    const user = userEvent.setup();
    mockConnectorsState = { data: [connector()], isLoading: false };
    mockCreateImport.mockImplementation((_data, options) => options.onSuccess(CREATED));
    mockRotateToken.mockImplementation((_id, options) =>
      options.onSuccess({
        credentials: { url: CREATED.url, token: 'rotated-token' },
        public_base_url_configured: true,
      })
    );
    renderFlyout();

    await waitFor(() => expect(screen.getByTestId('importsManagedSetupSubmit')).toBeEnabled());
    await user.click(screen.getByTestId('importsManagedSetupSubmit'));

    expect(screen.getByTestId('importsCredentialsUrl')).toHaveValue(CREATED.url);
    expect(screen.getByTestId('importsCredentialsHint')).toHaveTextContent('Datadog');
    expect(screen.queryByTestId('importsCredentialsToken')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('importsManagedRotateToken'));

    expect(mockRotateToken).toHaveBeenCalledWith('dd-1', expect.any(Object));
    expect(screen.getByTestId('importsCredentialsToken')).toHaveValue('rotated-token');
    expect(screen.getByTestId('importsCredentialsCurl')).toHaveTextContent('monitor_id');
  });

  it('sends a test alert for the new import', async () => {
    const user = userEvent.setup();
    mockConnectorsState = { data: [connector()], isLoading: false };
    mockCreateImport.mockImplementation((_data, options) => options.onSuccess(CREATED));
    renderFlyout();

    await waitFor(() => expect(screen.getByTestId('importsManagedSetupSubmit')).toBeEnabled());
    await user.click(screen.getByTestId('importsManagedSetupSubmit'));
    await user.click(await screen.findByTestId('importsSendTestAlertButton'));

    expect(mockTestImport).toHaveBeenCalledWith('dd-1', expect.any(Object));
  });

  it('does not offer a connector that already has an import', () => {
    mockConnectorsState = {
      data: [connector(), connector({ id: 'dd-2', name: 'Datadog (staging)' })],
      isLoading: false,
    };
    mockImportedConnectorIds = ['dd-1'];
    renderFlyout();

    // One connector left, so it is picked for the user.
    expect(screen.queryByTestId('importsManagedConnectorSelect')).toHaveValue('dd-2');
    expect(screen.queryByText('Datadog (prod)')).not.toBeInTheDocument();
  });

  it('lets the user choose when there are several connectors', async () => {
    const user = userEvent.setup();
    mockConnectorsState = {
      data: [connector(), connector({ id: 'dd-2', name: 'Datadog (staging)' })],
      isLoading: false,
    };
    renderFlyout();

    expect(screen.getByTestId('importsManagedSetupSubmit')).toBeDisabled();
    await user.selectOptions(screen.getByTestId('importsManagedConnectorSelect'), 'dd-2');

    await waitFor(() =>
      expect(screen.getByTestId('importsManagedFormName')).toHaveValue('Datadog (staging)')
    );
  });

  it('blocks creating when the connector has Receive events off, and offers to edit it', async () => {
    const user = userEvent.setup();
    mockConnectorsState = {
      data: [connector({ isInboundEventsEnabled: false })],
      isLoading: false,
    };
    renderFlyout();

    expect(await screen.findByTestId('importsManagedReceiveEventsOff')).toHaveTextContent(
      'Receive events'
    );
    expect(screen.getByTestId('importsManagedSetupSubmit')).toBeDisabled();

    await user.click(screen.getByTestId('importsManagedEditConnector'));

    expect(mockGetEditConnectorFlyout).toHaveBeenCalledWith(
      expect.objectContaining({ connector: expect.objectContaining({ id: 'dd-1' }) })
    );
  });

  it('goes back to the picker', async () => {
    const user = userEvent.setup();
    const { onBack } = renderFlyout();

    await user.click(screen.getByTestId('importsManagedSetupBack'));

    expect(onBack).toHaveBeenCalled();
  });
});
