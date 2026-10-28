/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectorFormTestProvider } from '../lib/test_utils';
import { OAuthAuthCodeFields } from './oauth_auth_code_fields';

jest.mock('@kbn/triggers-actions-ui-plugin/public/application/lib/action_connector_api', () => ({
  ...jest.requireActual(
    '@kbn/triggers-actions-ui-plugin/public/application/lib/action_connector_api'
  ),
  checkConnectorIdAvailability: jest.fn().mockResolvedValue({ isAvailable: true }),
}));

const connector = {
  actionTypeId: '.mcp',
  name: 'mcp',
  id: '1',
  config: {
    serverUrl: 'https://example.com',
  },
  secrets: {},
  isDeprecated: false,
};

describe('OAuthAuthCodeFields', () => {
  it('renders the OAuth fields', async () => {
    render(
      <ConnectorFormTestProvider connector={connector}>
        <OAuthAuthCodeFields readOnly={false} />
      </ConnectorFormTestProvider>
    );

    expect(await screen.findByTestId('mcpOAuthAuthorizationUrl')).toBeInTheDocument();
    expect(screen.getByTestId('mcpOAuthTokenUrl')).toBeInTheDocument();
    expect(screen.getByTestId('mcpOAuthClientId')).toBeInTheDocument();
    expect(screen.getByTestId('mcpOAuthClientSecret')).toBeInTheDocument();
    expect(screen.getByTestId('mcpOAuthScope')).toBeInTheDocument();
  });

  it('shows required errors when required fields are empty', async () => {
    const onSubmit = jest.fn();

    render(
      <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
        <OAuthAuthCodeFields readOnly={false} />
      </ConnectorFormTestProvider>
    );

    await userEvent.click(screen.getByTestId('form-test-provide-submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
    });
    expect(screen.getByText('Authorization URL is required.')).toBeInTheDocument();
    expect(screen.getByText('Token URL is required.')).toBeInTheDocument();
    expect(screen.getByText('Client ID is required.')).toBeInTheDocument();
    expect(screen.getByText('Client secret is required.')).toBeInTheDocument();
  });

  it('submits the OAuth config and client secret', async () => {
    const onSubmit = jest.fn();

    render(
      <ConnectorFormTestProvider connector={connector} onSubmit={onSubmit}>
        <OAuthAuthCodeFields readOnly={false} />
      </ConnectorFormTestProvider>
    );

    await userEvent.type(
      screen.getByTestId('mcpOAuthAuthorizationUrl'),
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
            authorizationUrl: 'https://idp.example.com/authorize',
            tokenUrl: 'https://idp.example.com/token',
            clientId: 'client-id',
            scope: 'tools',
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
