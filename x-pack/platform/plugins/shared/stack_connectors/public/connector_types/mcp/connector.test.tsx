/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConnectorFields from './connector';
import { ConnectorFormTestProvider } from '../lib/test_utils';
import { useSecretHeaders } from '../../common/auth/use_secret_headers';
import { formSerializer } from './utils/serialization';

jest.mock('../../common/auth/use_secret_headers');
jest.mock('@kbn/triggers-actions-ui-plugin/public/application/lib/action_connector_api', () => ({
  ...jest.requireActual(
    '@kbn/triggers-actions-ui-plugin/public/application/lib/action_connector_api'
  ),
  checkConnectorIdAvailability: jest.fn().mockResolvedValue({ isAvailable: true }),
}));
const useSecretHeadersMock = useSecretHeaders as jest.Mock;

const baseConnector = {
  actionTypeId: '.mcp',
  name: 'mcp',
  id: '1',
  config: {
    serverUrl: 'https://example.com',
  },
  secrets: {},
  isDeprecated: false,
};

describe('MCP ConnectorFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSecretHeadersMock.mockReturnValue({ isLoading: false, isFetching: false, data: [] });
  });

  it('shows None selected and hides OAuth fields by default', async () => {
    render(
      <ConnectorFormTestProvider connector={baseConnector}>
        <ConnectorFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
      </ConnectorFormTestProvider>
    );

    expect(await screen.findByRole('radio', { name: /None/ })).toBeChecked();
    expect(screen.queryByTestId('mcpOAuthAuthorizationUrl')).not.toBeInTheDocument();
    expect(screen.getByTestId('mcpAuthTypeSelector')).toBeEnabled();
  });

  it('shows OAuth fields when OAuth is selected', async () => {
    render(
      <ConnectorFormTestProvider connector={baseConnector}>
        <ConnectorFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
      </ConnectorFormTestProvider>
    );

    await userEvent.click(await screen.findByTestId('mcpAuthTypeOAuthAuthorizationCode'));

    expect(await screen.findByTestId('mcpOAuthAuthorizationUrl')).toBeInTheDocument();
    expect(screen.getByTestId('mcpOAuthTokenUrl')).toBeInTheDocument();
    expect(screen.getByTestId('mcpOAuthClientId')).toBeInTheDocument();
    expect(screen.getByTestId('mcpOAuthClientSecret')).toBeInTheDocument();
    expect(screen.getByTestId('mcpOAuthScope')).toBeInTheDocument();
  });

  it('disables the auth type selector on edit when the connector is per-user', async () => {
    render(
      <ConnectorFormTestProvider
        connector={{
          ...baseConnector,
          authMode: 'per-user',
          config: {
            serverUrl: 'https://example.com',
            authType: 'oauth_authorization_code',
          },
        }}
      >
        <ConnectorFields
          readOnly={false}
          isEdit={true}
          authMode="per-user"
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    expect(await screen.findByTestId('mcpAuthTypeSelector')).toBeDisabled();
  });

  it('should render server URL field', async () => {
    render(
      <ConnectorFormTestProvider connector={baseConnector}>
        <ConnectorFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
      </ConnectorFormTestProvider>
    );

    expect(await screen.findByLabelText('Server URL')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://example.com')).toBeInTheDocument();
  });

  describe('accordion state', () => {
    it('should open accordion when secret headers are returned from API', async () => {
      useSecretHeadersMock.mockReturnValue({
        isLoading: false,
        isFetching: false,
        data: ['X-Secret-Key'],
      });

      render(
        <ConnectorFormTestProvider connector={baseConnector}>
          <ConnectorFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
        </ConnectorFormTestProvider>
      );

      await waitFor(() => {
        const accordionButton = screen.getByRole('button', { name: /additional settings/i });
        expect(accordionButton).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('should open accordion when config headers exist', async () => {
      const connectorWithHeaders = {
        ...baseConnector,
        config: {
          serverUrl: 'https://example.com',
          headers: { 'X-Custom-Header': 'value' },
        },
        __internal__: {
          hasHeaders: true,
          headers: [{ key: 'X-Custom-Header', value: 'value', type: 'config' }],
        },
      };

      render(
        <ConnectorFormTestProvider connector={connectorWithHeaders}>
          <ConnectorFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
        </ConnectorFormTestProvider>
      );

      await waitFor(() => {
        const accordionButton = screen.getByRole('button', { name: /additional settings/i });
        expect(accordionButton).toHaveAttribute('aria-expanded', 'true');
      });
    });
  });

  describe('validation', () => {
    const onSubmit = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should fail when serverUrl is empty', async () => {
      const connector = {
        ...baseConnector,
        config: { serverUrl: '' },
      };

      render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <ConnectorFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
        </ConnectorFormTestProvider>
      );

      await userEvent.click(screen.getByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
      });
    });

    it('should fail when serverUrl is not a valid URL', async () => {
      const connector = {
        ...baseConnector,
        config: { serverUrl: 'invalid-url' },
      };

      render(
        <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
          <ConnectorFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
        </ConnectorFormTestProvider>
      );

      await userEvent.click(screen.getByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
      });
    });

    it('submits OAuth fields and still serializes headers', async () => {
      const connector = {
        ...baseConnector,
        config: {
          serverUrl: 'https://example.com',
          headers: { 'X-Custom-Header': 'value' },
        },
        __internal__: {
          hasHeaders: true,
          headers: [{ key: 'X-Custom-Header', value: 'value', type: 'config' }],
        },
      };

      render(
        <ConnectorFormTestProvider
          connector={connector}
          onSubmit={onSubmit}
          serializer={formSerializer}
        >
          <ConnectorFields readOnly={false} isEdit={false} registerPreSubmitValidator={() => {}} />
        </ConnectorFormTestProvider>
      );

      await userEvent.click(await screen.findByTestId('mcpAuthTypeOAuthAuthorizationCode'));
      await userEvent.type(
        await screen.findByTestId('mcpOAuthAuthorizationUrl'),
        'https://idp.example.com/authorize'
      );
      await userEvent.type(screen.getByTestId('mcpOAuthTokenUrl'), 'https://idp.example.com/token');
      await userEvent.type(screen.getByTestId('mcpOAuthClientId'), 'client-id');
      await userEvent.type(screen.getByTestId('mcpOAuthClientSecret'), 'client-secret');
      await userEvent.type(screen.getByTestId('mcpOAuthScope'), 'tools');
      await userEvent.click(screen.getByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          data: expect.objectContaining({
            config: expect.objectContaining({
              authType: 'oauth_authorization_code',
              authorizationUrl: 'https://idp.example.com/authorize',
              tokenUrl: 'https://idp.example.com/token',
              clientId: 'client-id',
              scope: 'tools',
              headers: { 'X-Custom-Header': 'value' },
            }),
            secrets: expect.objectContaining({
              clientSecret: 'client-secret',
            }),
          }),
          isValid: true,
        });
      });
    });
  });
});
