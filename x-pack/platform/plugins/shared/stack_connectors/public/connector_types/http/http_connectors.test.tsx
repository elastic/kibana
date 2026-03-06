/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HttpActionConnectorFields from './http_connectors';
import { ConnectorFormTestProvider } from '../lib/test_utils';
import { formSerializer, formDeserializer } from '../lib/http/form_serialization';

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');

// Avoid loading AuthConfig (and its useSecretHeaders/useQuery) in unit tests
jest.mock('../../common/auth/auth_config', () => ({
  __esModule: true,
  default: () => <div data-test-subj="authConfigMock">Auth</div>,
}));

describe('HttpActionConnectorFields', () => {
  const connector = {
    id: 'test',
    actionTypeId: '.http',
    name: 'HTTP',
    config: {
      url: 'https://example.com/api',
      hasAuth: true,
      authType: 'webhook-authentication-basic',
      headers: null,
    },
    secrets: {
      user: null,
      password: null,
      crt: null,
      key: null,
      pfx: null,
      clientSecret: null,
      secretHeaders: null,
    },
    isDeprecated: false,
  };

  it('renders base URL field and proxy section', async () => {
    render(
      <ConnectorFormTestProvider
        connector={connector}
        serializer={formSerializer}
        deserializer={formDeserializer}
      >
        <HttpActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={jest.fn()}
        />
      </ConnectorFormTestProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('httpUrlText')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /proxy/i })).toBeInTheDocument();
  });

  it('renders proxy fields when proxy accordion is opened', async () => {
    render(
      <ConnectorFormTestProvider
        connector={connector}
        serializer={formSerializer}
        deserializer={formDeserializer}
      >
        <HttpActionConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={jest.fn()}
        />
      </ConnectorFormTestProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('httpUrlText')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /proxy/i }));

    await waitFor(() => {
      expect(screen.getByTestId('httpProxyUrlText')).toBeInTheDocument();
    });
    expect(screen.getByTestId('httpProxyVerificationModeSelect')).toBeInTheDocument();
    expect(screen.getByTestId('httpProxyUsernameInput')).toBeInTheDocument();
    expect(screen.getByTestId('httpProxyPasswordInput')).toBeInTheDocument();
  });
});
