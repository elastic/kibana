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
import { CustomImportSetupFlyout } from './custom_import_setup_flyout';

const mockCreateImport = jest.fn();
const mockResetCreate = jest.fn();
const mockTestImport = jest.fn();
let mockCreateState: { isLoading: boolean; isError: boolean; error: unknown } = {
  isLoading: false,
  isError: false,
  error: null,
};
let mockTestState: { isLoading: boolean; isSuccess: boolean; isError: boolean; error: unknown } = {
  isLoading: false,
  isSuccess: false,
  isError: false,
  error: null,
};

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'userProfile') {
      return {
        getCurrent: () =>
          Promise.resolve({ user: { username: 'elastic', full_name: 'Elastic User' } }),
      };
    }
    return {};
  },
  CoreStart: (key: string) => key,
}));

jest.mock('../../hooks/use_create_import', () => ({
  useCreateImport: () => ({
    mutate: mockCreateImport,
    reset: mockResetCreate,
    ...mockCreateState,
  }),
}));

jest.mock('../../hooks/use_test_import', () => ({
  useTestImport: () => ({ mutate: mockTestImport, reset: jest.fn(), ...mockTestState }),
}));

const CREATED: CreateImportResponse = {
  import: {
    id: 'import-1',
    name: 'Datadog monitors',
    kind: 'custom',
    enabled: true,
    source: 'datadog-monitors',
    connector_id: 'connector-1',
    workflow_id: 'workflow-1',
    tags: [],
    routing_tags: [],
    fingerprint_field: 'monitor_id',
    created_by: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_by: null,
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  url: 'https://kibana.test/api/actions/events/.inboundWebhook/connector-1',
  credentials: {
    url: 'https://kibana.test/api/actions/events/.inboundWebhook/connector-1',
    token: 'secret-token',
  },
  public_base_url_configured: true,
};

const renderFlyout = ({ withBack = false }: { withBack?: boolean } = {}) => {
  const onClose = jest.fn();
  const onCreated = jest.fn();
  const onBack = jest.fn();
  render(
    <I18nProvider>
      <MockLocatorProvider>
        <CustomImportSetupFlyout
          onClose={onClose}
          onCreated={onCreated}
          onBack={withBack ? onBack : undefined}
        />
      </MockLocatorProvider>
    </I18nProvider>
  );
  return { onClose, onCreated, onBack };
};

const succeedWith = (response: CreateImportResponse) =>
  mockCreateImport.mockImplementation((_data, options) => options.onSuccess(response));

describe('CustomImportSetupFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateState = { isLoading: false, isError: false, error: null };
    mockTestState = { isLoading: false, isSuccess: false, isError: false, error: null };
  });

  it('is called Custom webhook, and goes back to the picker when it was opened from there', async () => {
    const user = userEvent.setup();
    const { onBack } = renderFlyout({ withBack: true });

    expect(screen.getByTestId('importsSetupFlyoutTitle')).toHaveTextContent('Custom webhook');
    expect(screen.queryByTestId('importsSetupCancel')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('importsSetupBack'));

    expect(onBack).toHaveBeenCalled();
  });

  it('keeps Create import disabled until the form is valid', async () => {
    const user = userEvent.setup();
    renderFlyout();

    expect(screen.getByTestId('importsSetupSubmit')).toBeDisabled();

    await user.type(screen.getByTestId('importsFormName'), 'Datadog monitors');

    await waitFor(() => expect(screen.getByTestId('importsSetupSubmit')).toBeEnabled());
  });

  it('defaults the source to a slug of the name until the user edits it', async () => {
    const user = userEvent.setup();
    renderFlyout();

    await user.type(screen.getByTestId('importsFormName'), 'Datadog monitors');
    await waitFor(() =>
      expect(screen.getByTestId('importsFormSource')).toHaveValue('datadog-monitors')
    );

    await user.clear(screen.getByTestId('importsFormSource'));
    await user.type(screen.getByTestId('importsFormSource'), 'dd');
    await user.type(screen.getByTestId('importsFormName'), ' prod');

    expect(screen.getByTestId('importsFormSource')).toHaveValue('dd');
  });

  it('defaults the owner to the current user', async () => {
    renderFlyout();

    await waitFor(() => expect(screen.getByTestId('importsFormOwner')).toHaveValue('Elastic User'));
  });

  it('blocks a source that starts with elastic', async () => {
    const user = userEvent.setup();
    renderFlyout();

    await user.type(screen.getByTestId('importsFormName'), 'Datadog');
    await user.clear(screen.getByTestId('importsFormSource'));
    await user.type(screen.getByTestId('importsFormSource'), 'elastic-x');

    await waitFor(() =>
      expect(screen.getByText(/cannot start with "elastic"/)).toBeInTheDocument()
    );
    expect(screen.getByTestId('importsSetupSubmit')).toBeDisabled();
  });

  it('blocks a fingerprint field that is not a dotted path', async () => {
    const user = userEvent.setup();
    renderFlyout();

    await user.type(screen.getByTestId('importsFormName'), 'Datadog');
    await user.type(screen.getByTestId('importsFormFingerprintField'), 'my field');

    await waitFor(() => expect(screen.getByText(/Use a field path/)).toBeInTheDocument());
    expect(screen.getByTestId('importsSetupSubmit')).toBeDisabled();
  });

  it('creates the import with the form values', async () => {
    const user = userEvent.setup();
    succeedWith(CREATED);
    renderFlyout();

    await user.type(screen.getByTestId('importsFormName'), 'Datadog monitors');
    await user.type(screen.getByTestId('importsFormFingerprintField'), 'monitor_id');
    await waitFor(() => expect(screen.getByTestId('importsSetupSubmit')).toBeEnabled());
    await user.click(screen.getByTestId('importsSetupSubmit'));

    await waitFor(() => expect(mockCreateImport).toHaveBeenCalledTimes(1));
    expect(mockCreateImport.mock.calls[0][0]).toEqual({
      name: 'Datadog monitors',
      source: 'datadog-monitors',
      default_severity: 'medium',
      fingerprint_field: 'monitor_id',
      owner: 'Elastic User',
    });
  });

  it('switches to Connect your source with the one-time credentials after creating', async () => {
    const user = userEvent.setup();
    succeedWith(CREATED);
    const { onCreated, onClose } = renderFlyout();

    await user.type(screen.getByTestId('importsFormName'), 'Datadog monitors');
    await waitFor(() => expect(screen.getByTestId('importsSetupSubmit')).toBeEnabled());
    await user.click(screen.getByTestId('importsSetupSubmit'));

    await waitFor(() => expect(screen.getByTestId('importsSetupConnect')).toBeInTheDocument());
    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('importsSetupFlyoutTitle')).toHaveTextContent('Connect your source');
    expect(screen.getByTestId('importsCredentialsTokenWarning')).toHaveTextContent(
      'Copy your token now, it is shown only once'
    );
    expect(screen.getByTestId('importsCredentialsUrl')).toHaveValue(CREATED.url);
    expect(screen.getByTestId('importsCredentialsToken')).toHaveValue('secret-token');
    expect(screen.getByTestId('importsCredentialsCurl')).toHaveTextContent(
      'Authorization: Bearer secret-token'
    );
    expect(screen.queryByTestId('importsCredentialsPublicBaseUrlWarning')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('importsSetupDone'));
    expect(onClose).toHaveBeenCalled();
  });

  it('warns when server.publicBaseUrl is not configured', async () => {
    const user = userEvent.setup();
    succeedWith({ ...CREATED, public_base_url_configured: false });
    renderFlyout();

    await user.type(screen.getByTestId('importsFormName'), 'Datadog monitors');
    await waitFor(() => expect(screen.getByTestId('importsSetupSubmit')).toBeEnabled());
    await user.click(screen.getByTestId('importsSetupSubmit'));

    await waitFor(() =>
      expect(screen.getByTestId('importsCredentialsPublicBaseUrlWarning')).toBeInTheDocument()
    );
  });

  it('sends a test alert for the new import', async () => {
    const user = userEvent.setup();
    succeedWith(CREATED);
    renderFlyout();

    await user.type(screen.getByTestId('importsFormName'), 'Datadog monitors');
    await waitFor(() => expect(screen.getByTestId('importsSetupSubmit')).toBeEnabled());
    await user.click(screen.getByTestId('importsSetupSubmit'));
    await user.click(await screen.findByTestId('importsSendTestAlertButton'));

    expect(screen.getByTestId('importsSendTestAlertButton')).toHaveTextContent(
      'Send test alert (creates a real alert)'
    );
    expect(mockTestImport).toHaveBeenCalledWith('import-1', expect.any(Object));
  });

  it('shows the server message and the failed step when creating fails', () => {
    mockCreateState = {
      isLoading: false,
      isError: true,
      error: {
        message: 'Bad Request',
        body: {
          message: 'Could not create the workflow',
          details: { step: 'create_workflow', rolled_back: true },
        },
      },
    };
    renderFlyout();

    expect(screen.getByTestId('importsSetupError')).toHaveTextContent(
      'Could not create the workflow'
    );
    expect(screen.getByTestId('importsSetupErrorStep')).toHaveTextContent(
      'Failed step: Creating the workflow.'
    );
    expect(screen.getByTestId('importsSetupErrorStep')).toHaveTextContent('removed');
  });

  it('blocks closing while the import is being created', async () => {
    const user = userEvent.setup();
    mockCreateState = { isLoading: true, isError: false, error: null };
    const { onClose } = renderFlyout();

    await user.click(screen.getByTestId('importsSetupCancel'));

    expect(onClose).not.toHaveBeenCalled();
  });
});
