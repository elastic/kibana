/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AuthConfig } from './auth_config';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AuthType } from '@kbn/connector-schemas/common/auth/constants';
import { AuthFormTestProvider } from '../../connector_types/lib/test_utils';
import { useSecretHeaders } from './use_secret_headers';

jest.mock('./use_secret_headers');

const useSecretHeadersMock = useSecretHeaders as jest.Mock;

describe('AuthConfig with isOAuth2PasswordEnabled on', () => {
  const onSubmit = jest.fn();

  beforeEach(() => {
    useSecretHeadersMock.mockReturnValue({ isLoading: false, isFetching: false, data: [] });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does not render the OAuth2 Password option by default', async () => {
    render(
      <AuthFormTestProvider defaultValue={{ config: { hasAuth: false } }} onSubmit={onSubmit}>
        <AuthConfig readOnly={false} />
      </AuthFormTestProvider>
    );

    expect(screen.queryByTestId('authOAuth2Password')).not.toBeInTheDocument();
  });

  it('renders the OAuth2 Password option when isOAuth2PasswordEnabled is true', async () => {
    render(
      <AuthFormTestProvider defaultValue={{ config: { hasAuth: false } }} onSubmit={onSubmit}>
        <AuthConfig readOnly={false} isOAuth2PasswordEnabled={true} />
      </AuthFormTestProvider>
    );

    expect(await screen.findByTestId('authOAuth2Password')).toBeInTheDocument();
    expect(await screen.findByText('OAuth 2.0 Password')).toBeInTheDocument();
  });

  it('renders the access token URL, username, and password fields when authType is OAuth2Password', async () => {
    const testFormData = {
      config: {
        hasAuth: true,
        authType: AuthType.OAuth2Password,
      },
    };

    render(
      <AuthFormTestProvider defaultValue={testFormData} onSubmit={onSubmit}>
        <AuthConfig readOnly={false} isOAuth2PasswordEnabled={true} />
      </AuthFormTestProvider>
    );

    expect(await screen.findByTestId('authOAuth2Password')).toBeInTheDocument();
    expect(await screen.findByTestId('accessTokenUrlOAuth2Password')).toBeInTheDocument();
    expect(await screen.findByTestId('usernameOAuth2Password')).toBeInTheDocument();
    expect(await screen.findByTestId('passwordOAuth2Password')).toBeInTheDocument();
  });

  it('submits accessTokenUrl, username, and password when authType is OAuth2Password', async () => {
    const testFormData = {
      config: {
        hasAuth: true,
        authType: AuthType.OAuth2Password,
        accessTokenUrl: 'https://token.url',
      },
      secrets: {
        user: 'my-user',
        password: 'my-password',
      },
    };

    render(
      <AuthFormTestProvider defaultValue={testFormData} onSubmit={onSubmit}>
        <AuthConfig readOnly={false} isOAuth2PasswordEnabled={true} />
      </AuthFormTestProvider>
    );

    await userEvent.click(await screen.findByTestId('form-test-provide-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());

    expect(onSubmit).toHaveBeenCalledWith({
      data: {
        config: {
          hasAuth: true,
          authType: AuthType.OAuth2Password,
          accessTokenUrl: 'https://token.url',
        },
        secrets: {
          user: 'my-user',
          password: 'my-password',
        },
        __internal__: {
          hasHeaders: false,
          hasCA: false,
        },
      },
      isValid: true,
    });
  });

  it('fails validation when required OAuth2 Password fields are missing', async () => {
    const testFormData = {
      config: {
        hasAuth: true,
        authType: AuthType.OAuth2Password,
      },
    };

    render(
      <AuthFormTestProvider defaultValue={testFormData} onSubmit={onSubmit}>
        <AuthConfig readOnly={false} isOAuth2PasswordEnabled={true} />
      </AuthFormTestProvider>
    );

    await userEvent.click(await screen.findByTestId('form-test-provide-submit'));

    expect(await screen.findByText('Access token URL is required.')).toBeInTheDocument();
    expect(await screen.findByText('Username is required.')).toBeInTheDocument();
    expect(await screen.findByText('Password is required.')).toBeInTheDocument();

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
    });
  });
});
